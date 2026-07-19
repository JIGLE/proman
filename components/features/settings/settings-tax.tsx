"use client";

import { useEffect, useState } from "react";
import { Globe, Landmark, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/lib/contexts/toast-context";
import { useCsrf } from "@/lib/contexts/csrf-context";
import type { UserSettings } from "./settings-types";

interface FiscalProfile {
  fiscalResidency: string | null;
  nhrStatus: boolean;
  nhrYear: number | null;
  ificiStatus: boolean;
  ificiYear: number | null;
}

const defaultFiscalProfile: FiscalProfile = {
  fiscalResidency: null,
  nhrStatus: false,
  nhrYear: null,
  ificiStatus: false,
  ificiYear: null,
};

const currencies = [
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "DKK", label: "Danish Krone (kr)", symbol: "kr" },
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
  { value: "GBP", label: "British Pound (£)", symbol: "£" },
];

const countries = [
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Spain" },
  { value: "DK", label: "Denmark" },
];

const fiscalResidencyOptions = [
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Spain" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "IT", label: "Italy" },
  { value: "GB", label: "United Kingdom" },
  { value: "OTHER", label: "Other" },
];

interface SettingsTaxProps {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export function SettingsTax({ settings, updateSetting }: SettingsTaxProps) {
  const { success, error: showError } = useToast();
  const { token: csrfToken } = useCsrf();

  const [fiscalProfile, setFiscalProfile] = useState<FiscalProfile>(defaultFiscalProfile);
  const [fiscalLoading, setFiscalLoading] = useState(true);
  const [fiscalSaving, setFiscalSaving] = useState(false);
  const [fiscalHasChanges, setFiscalHasChanges] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/user/fiscal-profile");
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setFiscalProfile({ ...defaultFiscalProfile, ...data.data });
          }
        }
      } catch (err) {
        console.error("Failed to load fiscal profile:", err);
      } finally {
        setFiscalLoading(false);
      }
    })();
  }, []);

  const updateFiscalProfile = <K extends keyof FiscalProfile>(key: K, value: FiscalProfile[K]) => {
    setFiscalProfile((prev) => {
      const next: FiscalProfile = { ...prev, [key]: value };
      // Mutual exclusivity: toggling one disables the other
      if (key === "nhrStatus" && value === true) {
        next.ificiStatus = false;
        next.ificiYear = null;
      }
      if (key === "ificiStatus" && value === true) {
        next.nhrStatus = false;
        next.nhrYear = null;
      }
      // Clear year when status disabled
      if (key === "nhrStatus" && value === false) {
        next.nhrYear = null;
      }
      if (key === "ificiStatus" && value === false) {
        next.ificiYear = null;
      }
      return next;
    });
    setFiscalHasChanges(true);
  };

  const saveFiscalProfile = async () => {
    setFiscalSaving(true);
    try {
      const response = await fetch("/api/user/fiscal-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken || "" },
        body: JSON.stringify(fiscalProfile),
      });

      if (response.ok) {
        success("Tax profile saved successfully");
        setFiscalHasChanges(false);
      } else {
        const errBody = await response.json().catch(() => ({}));
        showError((errBody as { error?: string }).error ?? "Failed to save tax profile");
      }
    } catch {
      showError("Failed to save tax profile");
    } finally {
      setFiscalSaving(false);
    }
  };

  const isPortugal = fiscalProfile.fiscalResidency === "PT";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>Currency and tax configuration for your portfolio</CardDescription>
        </CardHeader>
        <CardContent className="max-w-sm space-y-4">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select
              value={settings.defaultCurrency}
              onValueChange={(value) =>
                updateSetting("defaultCurrency", value as UserSettings["defaultCurrency"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Tax Country</Label>
            <Select
              value={settings.defaultTaxCountry || ""}
              onValueChange={(value) => updateSetting("defaultTaxCountry", value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used as the default for tax calculations on new properties
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Tax &amp; Fiscal Profile
          </CardTitle>
          <CardDescription>
            Your personal tax residency and special regime status — used to calculate the correct
            tax rules on your rental income.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-lg space-y-6">
          {fiscalLoading ? (
            <div className="flex items-center justify-center h-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Fiscal Residency */}
              <div className="space-y-2">
                <Label htmlFor="fiscal-residency">Fiscal residency country</Label>
                <Select
                  value={fiscalProfile.fiscalResidency ?? ""}
                  onValueChange={(v) => updateFiscalProfile("fiscalResidency", v || null)}
                >
                  <SelectTrigger id="fiscal-residency" className="max-w-xs">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalResidencyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  The country where you are tax resident — determines which tax rules apply to your
                  rental income.
                </p>
              </div>

              {/* NHR Status — Portugal only */}
              {isPortugal && (
                <div className="space-y-4 rounded-lg border border-[var(--color-border)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="nhr-status">Non-Habitual Resident (NHR) status</Label>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        NHR grants a flat 20% tax rate on Portuguese-source income for 10 years.
                        Only valid if granted before Jan 2024.
                      </p>
                    </div>
                    <Switch
                      id="nhr-status"
                      checked={fiscalProfile.nhrStatus}
                      onCheckedChange={(v) => updateFiscalProfile("nhrStatus", v)}
                      disabled={fiscalProfile.ificiStatus}
                    />
                  </div>
                  {fiscalProfile.nhrStatus && (
                    <div className="space-y-1.5">
                      <Label htmlFor="nhr-year">Year granted</Label>
                      <Input
                        id="nhr-year"
                        type="number"
                        min={2009}
                        max={2024}
                        placeholder="e.g. 2022"
                        className="max-w-xs"
                        value={fiscalProfile.nhrYear ?? ""}
                        onChange={(e) => {
                          const v = e.target.value ? parseInt(e.target.value, 10) : null;
                          updateFiscalProfile("nhrYear", v);
                        }}
                      />
                    </div>
                  )}
                  {fiscalProfile.ificiStatus && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      NHR is disabled because IFICI is active. NHR and IFICI are mutually exclusive.
                    </p>
                  )}
                </div>
              )}

              {/* IFICI Status — Portugal only */}
              {isPortugal && (
                <div className="space-y-4 rounded-lg border border-[var(--color-border)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="ifici-status">IFICI regime (new NHR from 2024)</Label>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        IFICI (Incentivo Fiscal à Investigação Científica e Inovação) replaced NHR
                        for new applicants from 2024. Flat 20% rate.
                      </p>
                    </div>
                    <Switch
                      id="ifici-status"
                      checked={fiscalProfile.ificiStatus}
                      onCheckedChange={(v) => updateFiscalProfile("ificiStatus", v)}
                      disabled={fiscalProfile.nhrStatus}
                    />
                  </div>
                  {fiscalProfile.ificiStatus && (
                    <div className="space-y-1.5">
                      <Label htmlFor="ifici-year">Year granted</Label>
                      <Input
                        id="ifici-year"
                        type="number"
                        min={2024}
                        max={2030}
                        placeholder="e.g. 2024"
                        className="max-w-xs"
                        value={fiscalProfile.ificiYear ?? ""}
                        onChange={(e) => {
                          const v = e.target.value ? parseInt(e.target.value, 10) : null;
                          updateFiscalProfile("ificiYear", v);
                        }}
                      />
                    </div>
                  )}
                  {fiscalProfile.nhrStatus && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      IFICI is disabled because NHR is active. NHR and IFICI are mutually exclusive.
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={saveFiscalProfile}
                disabled={fiscalSaving || !fiscalHasChanges}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {fiscalSaving ? "Saving..." : "Save Tax Profile"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsTax;
