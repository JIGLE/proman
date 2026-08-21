"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Landmark, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Settings › System.
 *
 * This panel used to render a second system-status readout — database latency, uptime,
 * environment, email provider — fetched from `/api/health`. That duplicated `/admin` in a
 * user-facing screen, with a thinner and slightly different set of checks, so the two could
 * disagree and the one a non-admin saw was the less accurate of them.
 *
 * Instance health now lives in the admin area, which has its own shell precisely because it is
 * not part of the app. What remains here is what genuinely belongs to a user's settings: the tax
 * rules store, plus a way across for anyone who came looking for the status they remember.
 */
export function SettingsSystem() {
  const t = useTranslations("settings.panel");
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            {t("taxRulesStore")}
          </CardTitle>
          <CardDescription>{t("taxRulesStoreHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t("taxRulesIntro")}</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/settings/tax-rules")}>
            <Landmark className="h-4 w-4 mr-1.5" />
            {t("openTaxRules")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t("systemStatus")}
          </CardTitle>
          <CardDescription>{t("systemStatusMovedHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => router.push("/admin")}>
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            {t("openAdmin")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsSystem;
