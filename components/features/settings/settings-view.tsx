"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

/** Section ids only — labels resolve against `settings.nav` at render. */
const CORE_SECTIONS = [
  "account",
  "tax",
  "notifications",
  "security",
  "integrations",
  "system",
] as const;

type SectionValue = (typeof CORE_SECTIONS)[number] | "billing";

export function SettingsView(): React.ReactElement {
  const { data: session } = useSession();
  const { success, error: showError } = useToast();
  const t = useTranslations("settings.nav");
  const tForms = useTranslations("forms");
  const tActions = useTranslations("actions");
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
  const sections: readonly SectionValue[] = showBilling
    ? [...CORE_SECTIONS, "billing" as const]
    : CORE_SECTIONS;
  /** `tax` is the section id; its label lives under a different key. */
  const sectionLabel = (value: SectionValue) =>
    value === "tax" ? t("taxRegion") : t(value as Exclude<SectionValue, "tax">);

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
      success(t("toastSubscription"));
    } else if (checkout === "canceled") {
      showError(t("toastCanceled"));
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
        success(t("toastSaved"));
        setHasChanges(false);
        setTheme(settings.theme);
      } else {
        showError(t("toastSaveFailed"));
      }
    } catch {
      showError(t("toastSaveFailed"));
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
            {t("heading")}
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">{t("subtitle")}</p>
        </div>
        {hasChanges && (
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? tForms("saving") : tActions("save")}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Desktop vertical section nav — same left-border-accent language as
            the main sidebar, so Settings reads as its own mini nav rather
            than a page of tabs. */}
        <nav aria-label={t("sectionsLabel")} className="hidden md:block">
          <div className="space-y-0.5">
            {sections.map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                aria-current={activeSection === section ? "page" : undefined}
                className={cn(
                  "flex w-full items-center border-l-2 px-3 py-2 text-left text-sm transition-colors",
                  activeSection === section
                    ? "border-[var(--country-highlight-readable)] bg-[var(--color-hover)] font-medium text-[var(--country-highlight-readable)]"
                    : "border-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover)] hover:text-[var(--color-foreground)]",
                )}
              >
                {sectionLabel(section)}
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
                <SelectItem key={section} value={section}>
                  {sectionLabel(section)}
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
