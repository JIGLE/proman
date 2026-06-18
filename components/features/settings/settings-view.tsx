"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Bell,
  Globe,
  Shield,
  Save,
  Info,
  Server,
  Database,
  HardDrive,
  Activity,
  Landmark,
  Lock,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/contexts/toast-context";

interface UserSettings {
  theme: "light" | "dark" | "system";
  language: string;
  defaultCurrency: "EUR" | "DKK" | "USD" | "GBP";
  defaultTaxCountry: string | null;
  emailNotifications: boolean;
  taxReminderNotifications: boolean;
  distributionNotifications: boolean;
}

interface FiscalProfile {
  fiscalResidency: string | null;
  nhrStatus: boolean;
  nhrYear: number | null;
  ificiStatus: boolean;
  ificiYear: number | null;
}

const defaultSettings: UserSettings = {
  theme: "system",
  language: "en",
  defaultCurrency: "EUR",
  defaultTaxCountry: null,
  emailNotifications: true,
  taxReminderNotifications: true,
  distributionNotifications: true,
};

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

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
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

export function SettingsView(): React.ReactElement {
  const { data: session } = useSession();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");
  const [systemInfo, setSystemInfo] = useState<{
    status: string;
    uptime: number;
    environment: string;
    checks: {
      database: { status: string; latency_ms: number };
      email: { status: string; provider?: string };
    };
  } | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);

  // Fiscal profile state
  const [fiscalProfile, setFiscalProfile] = useState<FiscalProfile>(defaultFiscalProfile);
  const [fiscalLoading, setFiscalLoading] = useState(true);
  const [fiscalSaving, setFiscalSaving] = useState(false);
  const [fiscalHasChanges, setFiscalHasChanges] = useState(false);

  // MFA / TOTP state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(true);
  const [totpSetupStep, setTotpSetupStep] = useState<"idle" | "qr" | "verify" | "backup">("idle");
  const [totpQr, setTotpQr] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpBackupCodes, setTotpBackupCodes] = useState<string[]>([]);
  const [totpWorking, setTotpWorking] = useState(false);

  // Extract current locale from pathname
  const currentLocale = pathname.split("/")[1] || "en";

  const fetchSystemInfo = async () => {
    setSystemLoading(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setSystemInfo(data);
      }
    } catch {
      // Health endpoint unavailable
    } finally {
      setSystemLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadFiscalProfile();
    loadTotpStatus();
    fetchSystemInfo();
    fetch("/version.json")
      .then((r) => r.json())
      .then((d) => setAppVersion(d.version || ""))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setSettings({ ...defaultSettings, ...data.data });
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFiscalProfile = async () => {
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
  };

  const loadTotpStatus = async () => {
    try {
      const res = await fetch("/api/auth/totp/status");
      if (res.ok) {
        const d = await res.json();
        setTotpEnabled(d.totpEnabled ?? false);
      }
    } catch {
      // ignore
    } finally {
      setTotpLoading(false);
    }
  };

  const startTotpSetup = async () => {
    setTotpWorking(true);
    try {
      const res = await fetch("/api/auth/totp/setup");
      if (!res.ok) throw new Error("Setup failed");
      const d = await res.json();
      setTotpQr(d.qrDataUrl);
      setTotpSecret(d.secret);
      setTotpCode("");
      setTotpSetupStep("qr");
    } catch {
      showError("Failed to start TOTP setup");
    } finally {
      setTotpWorking(false);
    }
  };

  const confirmTotpEnable = async () => {
    setTotpWorking(true);
    try {
      const res = await fetch("/api/auth/totp/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      if (!res.ok) {
        const d = await res.json();
        showError(d.error ?? "Invalid code");
        return;
      }
      const d = await res.json();
      setTotpBackupCodes(d.backupCodes);
      setTotpEnabled(true);
      setTotpSetupStep("backup");
      success("Two-factor authentication enabled");
    } catch {
      showError("Failed to enable TOTP");
    } finally {
      setTotpWorking(false);
    }
  };

  const disableTotp = async () => {
    setTotpWorking(true);
    try {
      const res = await fetch("/api/auth/totp/disable", { method: "DELETE" });
      if (!res.ok) throw new Error("Disable failed");
      setTotpEnabled(false);
      setTotpSetupStep("idle");
      success("Two-factor authentication disabled");
    } catch {
      showError("Failed to disable TOTP");
    } finally {
      setTotpWorking(false);
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);

    // If language changed, navigate to new locale immediately
    if (key === "language" && value !== currentLocale) {
      const newPath = pathname.replace(`/${currentLocale}`, `/${value}`);
      router.push(newPath);
    }
  };

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

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        success("Settings saved successfully");
        setHasChanges(false);
        applyTheme(settings.theme);
      } else {
        showError("Failed to save settings");
      }
    } catch {
      showError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveFiscalProfile = async () => {
    setFiscalSaving(true);
    try {
      const response = await fetch("/api/user/fiscal-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const applyTheme = (theme: "light" | "dark" | "system") => {
    const root = document.documentElement;
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isPortugal = fiscalProfile.fiscalResidency === "PT";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage your preferences and account settings
          </p>
        </div>
        {hasChanges && (
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="account">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="tax">Tax &amp; Fiscal</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Account tab */}
        <TabsContent value="account" className="mt-6 space-y-6">
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
                    <span>Domora v{appVersion}</span>
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
                    { value: "light", icon: Sun, label: "Light" },
                    { value: "dark", icon: Moon, label: "Dark" },
                    { value: "system", icon: Monitor, label: "System" },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={settings.theme === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSetting("theme", option.value as UserSettings["theme"])}
                      className="flex-1"
                    >
                      <option.icon className="h-4 w-4 mr-1" />
                      {option.label}
                    </Button>
                  ))}
                </div>
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
        </TabsContent>

        {/* Organization tab */}
        <TabsContent value="organization" className="mt-6">
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
        </TabsContent>

        {/* Tax & Fiscal Profile tab */}
        <TabsContent value="tax" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Tax &amp; Fiscal Profile
              </CardTitle>
              <CardDescription>
                Your personal tax residency and special regime status — used to calculate the
                correct tax rules on your rental income.
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
                      The country where you are tax resident — determines which tax rules apply to
                      your rental income.
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
                          NHR is disabled because IFICI is active. NHR and IFICI are mutually
                          exclusive.
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
                            IFICI (Incentivo Fiscal à Investigação Científica e Inovação) replaced
                            NHR for new applicants from 2024. Flat 20% rate.
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
                          IFICI is disabled because NHR is active. NHR and IFICI are mutually
                          exclusive.
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
        </TabsContent>

        {/* Notifications tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>Choose which email alerts you receive</CardDescription>
            </CardHeader>
            <CardContent className="max-w-lg space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>All Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive email updates about your properties
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tax Year Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Get reminded in January to generate tax forms
                  </p>
                </div>
                <Switch
                  checked={settings.taxReminderNotifications}
                  onCheckedChange={(checked) => updateSetting("taxReminderNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Income Distribution Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when distributions are calculated
                  </p>
                </div>
                <Switch
                  checked={settings.distributionNotifications}
                  onCheckedChange={(checked) => updateSetting("distributionNotifications", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System tab */}
        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>Server, database, and service health</CardDescription>
            </CardHeader>
            <CardContent className="max-w-lg space-y-4">
              {systemLoading ? (
                <div className="flex items-center justify-center h-16">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : systemInfo ? (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <Label>Database</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          systemInfo.checks.database.status === "healthy"
                            ? "bg-[var(--color-success)]"
                            : systemInfo.checks.database.status === "mock"
                              ? "bg-amber-500"
                              : "bg-[var(--color-destructive)]"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground capitalize">
                        {systemInfo.checks.database.status}
                      </span>
                      {systemInfo.checks.database.latency_ms > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({systemInfo.checks.database.latency_ms}ms)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <Label>Uptime</Label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(systemInfo.uptime / 3600)}h{" "}
                      {Math.floor((systemInfo.uptime % 3600) / 60)}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <Label>Environment</Label>
                    </div>
                    <span className="text-sm text-muted-foreground capitalize">
                      {systemInfo.environment}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <Label>Email Service</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          systemInfo.checks.email.status === "configured"
                            ? "bg-[var(--color-success)]"
                            : "bg-amber-500"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground capitalize">
                        {systemInfo.checks.email.status}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={fetchSystemInfo}>
                      Refresh
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to fetch system information</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Protect your account with an authenticator app (TOTP)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {totpLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : totpEnabled && totpSetupStep !== "backup" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Two-factor authentication is enabled</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={disableTotp}
                    disabled={totpWorking}
                  >
                    Disable 2FA
                  </Button>
                </div>
              ) : totpSetupStep === "idle" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Two-factor authentication adds an extra layer of security. After enabling, you
                    will need your authenticator app each time you sign in.
                  </p>
                  <Button size="sm" onClick={startTotpSetup} disabled={totpWorking}>
                    {totpWorking ? "Loading…" : "Set up 2FA"}
                  </Button>
                </div>
              ) : totpSetupStep === "qr" ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy,
                    etc.), then enter the 6-digit code to confirm.
                  </p>
                  {totpQr && (
                    <picture>
                      <img src={totpQr} alt="TOTP QR code" className="w-48 h-48 rounded-lg" />
                    </picture>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      Can&apos;t scan? Enter manually
                    </summary>
                    <code className="block mt-2 p-2 bg-muted rounded text-xs break-all select-all">
                      {totpSecret}
                    </code>
                  </details>
                  <div className="space-y-2">
                    <Label htmlFor="totp-code">Verification code</Label>
                    <Input
                      id="totp-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      className="w-40 text-center tracking-widest text-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={confirmTotpEnable}
                      disabled={totpWorking || totpCode.length !== 6}
                    >
                      {totpWorking ? "Verifying…" : "Enable 2FA"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTotpSetupStep("idle")}
                      disabled={totpWorking}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : totpSetupStep === "backup" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Two-factor authentication has been enabled!</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Backup codes</p>
                    <p className="text-sm text-muted-foreground">
                      Save these codes somewhere safe. Each can be used once if you lose access to
                      your authenticator app.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 p-3 bg-muted rounded-lg font-mono text-sm">
                      {totpBackupCodes.map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        navigator.clipboard.writeText(totpBackupCodes.join("\n")).catch(() => {});
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy codes
                    </Button>
                  </div>
                  <Button size="sm" onClick={() => setTotpSetupStep("idle")}>
                    Done
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing tab */}
        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Subscription &amp; Billing
              </CardTitle>
              <CardDescription>Manage your plan and payment details</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Subscription management is coming soon. Contact support for billing questions.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SettingsView;
