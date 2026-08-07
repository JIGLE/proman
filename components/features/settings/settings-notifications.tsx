"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserSettings } from "./settings-types";

interface SettingsNotificationsProps {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export function SettingsNotifications({ settings, updateSetting }: SettingsNotificationsProps) {
  const t = useTranslations("settings.panel");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("emailNotifications")}
        </CardTitle>
        <CardDescription>{t("emailNotificationsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("allEmail")}</Label>
            <p className="text-xs text-muted-foreground">{t("allEmailHelp")}</p>
          </div>
          <Switch
            checked={settings.emailNotifications}
            onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("taxYearReminders")}</Label>
            <p className="text-xs text-muted-foreground">{t("taxYearRemindersHelp")}</p>
          </div>
          <Switch
            checked={settings.taxReminderNotifications}
            onCheckedChange={(checked) => updateSetting("taxReminderNotifications", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("incomeAlerts")}</Label>
            <p className="text-xs text-muted-foreground">{t("incomeAlertsHelp")}</p>
          </div>
          <Switch
            checked={settings.distributionNotifications}
            onCheckedChange={(checked) => updateSetting("distributionNotifications", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default SettingsNotifications;
