"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Save, Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/utils";
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

const CORE_SECTIONS = [
  { value: "account", label: "Account" },
  { value: "tax", label: "Tax & Region" },
  { value: "notifications", label: "Notifications" },
  { value: "security", label: "Security" },
  { value: "integrations", label: "Integrations" },
  { value: "system", label: "System" },
] as const;

type SectionValue = (typeof CORE_SECTIONS)[number]["value"] | "billing";

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

  const [activeSection, setActiveSection] = useState<SectionValue>(
    (searchParams.get("tab") as SectionValue | null) ?? "account",
  );
  const sections = showBilling
    ? [...CORE_SECTIONS, { value: "billing" as const, label: "Billing" }]
    : CORE_SECTIONS;

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

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Desktop vertical section nav — same left-border-accent language as
            the main sidebar, so Settings reads as its own mini nav rather
            than a page of tabs. */}
        <nav aria-label="Settings sections" className="hidden md:block">
          <div className="space-y-0.5">
            {sections.map((section) => (
              <button
                key={section.value}
                type="button"
                onClick={() => setActiveSection(section.value)}
                aria-current={activeSection === section.value ? "page" : undefined}
                className={cn(
                  "flex w-full items-center border-l-2 px-3 py-2 text-left text-sm transition-colors",
                  activeSection === section.value
                    ? "border-[var(--country-highlight-readable)] bg-[var(--color-hover)] font-medium text-[var(--country-highlight-readable)]"
                    : "border-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]",
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile section picker */}
        <div className="md:hidden">
          <Select
            value={activeSection}
            onValueChange={(value: string) => setActiveSection(value as SectionValue)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.value} value={section.value}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          {activeSection === "account" && (
            <SettingsAccount
              settings={settings}
              updateSetting={updateSetting}
              appVersion={appVersion}
            />
          )}
          {activeSection === "tax" && (
            <SettingsTax settings={settings} updateSetting={updateSetting} />
          )}
          {activeSection === "notifications" && (
            <SettingsNotifications settings={settings} updateSetting={updateSetting} />
          )}
          {activeSection === "security" && <SettingsSecurity />}
          {activeSection === "integrations" && <SettingsIntegrations />}
          {activeSection === "system" && <SettingsSystem />}
          {activeSection === "billing" && showBilling && (
            <SettingsBilling billing={billing} billingLoading={billingLoading} />
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
