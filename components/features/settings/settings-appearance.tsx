"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { useTheme } from "@/lib/contexts/theme-context";
import { COUNTRY_CODES, COUNTRY_THEMES, isCountryCode } from "@/lib/design/country-themes";
import { locales, localeNames } from "@/lib/i18n/config";
import type { UserSettings } from "./settings-types";

/** Theme option ids paired with their icon; labels resolve from the catalog. */
const THEME_OPTIONS = [
  { value: "normal", icon: Sun, labelKey: "themeMatchedNormal" },
  { value: "dark", icon: Moon, labelKey: "themeMatchedDark" },
  { value: "system", icon: Monitor, labelKey: "themeSystem" },
] as const;

interface SettingsAppearanceProps {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

/**
 * Appearance was buried inside the Account section, which also held identity fields and the
 * GDPR export/delete controls — three unrelated jobs on one screen. It is its own section now,
 * which also gives the sidebar's `?tab=appearance` link a real target; it had been falling
 * through to the default tab because no such section existed.
 */
export function SettingsAppearance({ settings, updateSetting }: SettingsAppearanceProps) {
  const t = useTranslations("settings.panel");
  const { setTheme, country, setCountry } = useTheme();
  const activeLocale = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          {t("appearance")}
        </CardTitle>
        <CardDescription>{t("appearanceDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t("theme")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={settings.theme === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const value = option.value as UserSettings["theme"];
                  updateSetting("theme", value);
                  // Apply immediately through the global theme context so the change is visible
                  // at once and persists across reloads — independent of the server save.
                  setTheme(value);
                }}
                className="flex-1"
              >
                <option.icon className="h-4 w-4 mr-1" />
                {t(option.labelKey)}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("countryPalette")}</Label>
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
          <p className="text-xs text-muted-foreground">{t("countryPaletteHelp")}</p>
        </div>

        <div className="space-y-2">
          <Label>{t("language")}</Label>
          {/* Driven by the supported-locale list rather than a local array — that array was
              missing Italian, so `it` users could not pick their own language here. */}
          <Select
            value={settings.language || activeLocale}
            onValueChange={(value) => updateSetting("language", value)}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder={t("selectLanguage")} />
            </SelectTrigger>
            <SelectContent>
              {locales.map((code) => (
                <SelectItem key={code} value={code}>
                  {localeNames[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export default SettingsAppearance;
