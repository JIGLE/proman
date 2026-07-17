"use client";

import { Info, Moon, Shield, Sun, Monitor } from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/lib/contexts/toast-context";
import { useCsrf } from "@/lib/contexts/csrf-context";
import { useTheme } from "@/lib/contexts/theme-context";
import { COUNTRY_CODES, COUNTRY_THEMES, isCountryCode } from "@/lib/design/country-themes";
import type { UserSettings } from "./settings-types";

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
];

interface SettingsAccountProps {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  appVersion: string;
}

export function SettingsAccount({ settings, updateSetting, appVersion }: SettingsAccountProps) {
  const { data: session } = useSession();
  const { error: showError } = useToast();
  const { token: csrfToken } = useCsrf();
  const { setTheme, country, setCountry } = useTheme();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">
              {session?.user?.email || "Not available"}
            </p>
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <p className="text-sm text-muted-foreground">{session?.user?.name || "Not set"}</p>
          </div>
          {appVersion && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>Situs v{appVersion}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how the app looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {[
                { value: "normal", icon: Sun, label: "Matched Normal" },
                { value: "dark", icon: Moon, label: "Matched Dark" },
                { value: "system", icon: Monitor, label: "System" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.theme === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const value = option.value as UserSettings["theme"];
                    updateSetting("theme", value);
                    // Apply immediately through the global theme context so the
                    // change is visible at once and persists across reloads —
                    // independent of the server save below.
                    setTheme(value);
                  }}
                  className="flex-1"
                >
                  <option.icon className="h-4 w-4 mr-1" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Country palette</Label>
            <Select
              value={country}
              onValueChange={(value) => {
                if (isCountryCode(value)) setCountry(value);
              }}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {COUNTRY_THEMES[code].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sets the Situs Portal logo colours and the interface accent to your country&apos;s
              flag palette. Readability-first: the accent is contrast-adjusted, and status colours
              stay the same across every country.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={settings.language}
              onValueChange={(value) => updateSetting("language", value)}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* GDPR — data rights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Data Rights (GDPR)
          </CardTitle>
          <CardDescription>
            Export or permanently delete your personal data at any time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-sm font-medium">Export my data</p>
              <p className="text-xs text-muted-foreground">
                Download a JSON file containing all your account data, properties, tenants, leases,
                and audit history.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/user/export-data", {
                      method: "POST",
                      headers: { "X-CSRF-Token": csrfToken || "" },
                    });
                    if (!res.ok) throw new Error("Export failed");
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "situs-data.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    showError("Export failed. Please try again.");
                  }
                }}
              >
                Export my data
              </Button>
            </div>
            <div className="rounded-lg border border-destructive/30 p-4 space-y-2">
              <p className="text-sm font-medium text-destructive">Delete my account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (
                    !window.confirm(
                      "This will permanently delete your account and all data. Are you sure?",
                    )
                  )
                    return;
                  try {
                    const res = await fetch("/api/user/delete-data", {
                      method: "POST",
                      headers: { "X-CSRF-Token": csrfToken || "" },
                    });
                    if (!res.ok) throw new Error("Delete failed");
                    window.location.href = "/auth/signin";
                  } catch {
                    showError("Deletion failed. Please try again.");
                  }
                }}
              >
                Delete my account
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Data retention: audit logs are kept for 7 years (legal obligation), email logs for 2
            years, read notifications for 1 year. Automatic purge runs daily.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsAccount;
