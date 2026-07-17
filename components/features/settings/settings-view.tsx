"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Save, Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/lib/contexts/toast-context";
import { useCsrf } from "@/lib/contexts/csrf-context";
import { useTheme } from "@/lib/contexts/theme-context";
import { SettingsAccount } from "./settings-account";
import { SettingsTax } from "./settings-tax";
import { SettingsNotifications } from "./settings-notifications";
import { SettingsSecurity } from "./settings-security";
import { SettingsSystem } from "./settings-system";
import { SettingsIntegrations } from "./settings-integrations";
import { SettingsBilling } from "./settings-billing";
import { defaultSettings, type BillingInfo, type UserSettings } from "./settings-types";

export function SettingsView(): React.ReactElement {
  const { data: session } = useSession();
  const { success, error: showError } = useToast();
  const { token: csrfToken } = useCsrf();
  const { setTheme } = useTheme();
  const searchParams = useSearchParams();

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  // Whether to surface any subscription UI at all. Off on self-hosted instances
  // (ENABLE_BILLING unset) so the account never sees subscription framing.
  const showBilling = billing?.billingEnabled === true;

  useEffect(() => {
    loadSettings();
    loadBilling();
    fetch("/version.json")
      .then((r) => r.json())
      .then((d) => setAppVersion(d.version || ""))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      success("Subscription updated — thank you!");
    } else if (checkout === "canceled") {
      showError("Checkout was canceled");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadBilling = async () => {
    try {
      const response = await fetch("/api/billing/subscription");
      if (response.ok) {
        const data = await response.json();
        if (data.data) setBilling(data.data);
      }
    } catch (err) {
      console.error("Failed to load billing info:", err);
    } finally {
      setBillingLoading(false);
    }
  };

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

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken || "" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        success("Settings saved successfully");
        setHasChanges(false);
        setTheme(settings.theme);
      } else {
        showError("Failed to save settings");
      }
    } catch {
      showError("Failed to save settings");
    } finally {
      setSaving(false);
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

      <Tabs defaultValue={searchParams.get("tab") ?? "account"}>
        {/* Scrollable on narrow screens — 7 tabs (6 + Billing when enabled) no
            longer fit a fixed width, but overflow-x-auto handles it. */}
        <TabsList className="flex w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="account" className="shrink-0">
            Account
          </TabsTrigger>
          <TabsTrigger value="tax" className="shrink-0">
            Tax &amp; Region
          </TabsTrigger>
          <TabsTrigger value="notifications" className="shrink-0">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="shrink-0">
            Security
          </TabsTrigger>
          <TabsTrigger value="integrations" className="shrink-0">
            Integrations
          </TabsTrigger>
          <TabsTrigger value="system" className="shrink-0">
            System
          </TabsTrigger>
          {showBilling && (
            <TabsTrigger value="billing" className="shrink-0">
              Billing
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <SettingsAccount
            settings={settings}
            updateSetting={updateSetting}
            appVersion={appVersion}
          />
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          <SettingsTax settings={settings} updateSetting={updateSetting} />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <SettingsNotifications settings={settings} updateSetting={updateSetting} />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SettingsSecurity />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <SettingsIntegrations />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SettingsSystem />
        </TabsContent>

        <TabsContent value="billing" className="mt-6" hidden={!showBilling}>
          <SettingsBilling billing={billing} billingLoading={billingLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SettingsView;
