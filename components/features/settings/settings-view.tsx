"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Settings, Moon, Sun, Monitor, Bell, Globe, Wallet, Shield, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const defaultSettings: UserSettings = {
  theme: "system",
  language: "en",
  defaultCurrency: "EUR",
  defaultTaxCountry: null,
  emailNotifications: true,
  taxReminderNotifications: true,
  distributionNotifications: true,
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

export function SettingsView(): React.ReactElement {
  const { data: session } = useSession();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Extract current locale from pathname
  const currentLocale = pathname.split('/')[1] || 'en';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
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

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // If language changed, navigate to new locale immediately
    if (key === 'language' && value !== currentLocale) {
      const newPath = pathname.replace(`/${currentLocale}`, `/${value}`);
      router.push(newPath);
    }
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
        
        // Apply theme immediately
        applyTheme(settings.theme);
      } else {
        showError("Failed to save settings");
      }
    } catch (err) {
      showError("Failed to save settings");
    } finally {
      setSaving(false);
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the app looks
            </CardDescription>
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
                <SelectTrigger>
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

        {/* Regional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional
            </CardTitle>
            <CardDescription>
              Currency and tax settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select
                value={settings.defaultCurrency}
                onValueChange={(value) => updateSetting("defaultCurrency", value as UserSettings["defaultCurrency"])}
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
                Used for tax calculations on new properties
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
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

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email || "Not available"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-sm text-muted-foreground">
                {session?.user?.name || "Not set"}
              </p>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" disabled>
                <Wallet className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SettingsView;
