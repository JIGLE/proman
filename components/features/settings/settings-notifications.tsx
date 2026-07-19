"use client";

import { Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserSettings } from "./settings-types";

interface SettingsNotificationsProps {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export function SettingsNotifications({ settings, updateSetting }: SettingsNotificationsProps) {
  return (
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
  );
}

export default SettingsNotifications;
