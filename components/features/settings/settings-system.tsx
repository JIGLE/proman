"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Bell, Database, HardDrive, Landmark, Server } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SystemInfo {
  status: string;
  uptime: number;
  environment: string;
  checks: {
    database: { status: string; latency_ms: number };
    email: { status: string; provider?: string };
  };
}

export function SettingsSystem() {
  const t = useTranslations("settings.panel");
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = pathname.split("/")[1] || "en";

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);

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
    fetchSystemInfo();
  }, []);

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${currentLocale}/settings/tax-rules`)}
          >
            <Landmark className="h-4 w-4 mr-1.5" />
            {t("openTaxRules")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t("systemStatus")}
          </CardTitle>
          <CardDescription>{t("systemStatusDescription")}</CardDescription>
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
                  <Label>{t("database")}</Label>
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
                  <Label>{t("uptime")}</Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {t("uptimeValue", {
                    hours: Math.floor(systemInfo.uptime / 3600),
                    minutes: Math.floor((systemInfo.uptime % 3600) / 60),
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <Label>{t("environment")}</Label>
                </div>
                <span className="text-sm text-muted-foreground capitalize">
                  {systemInfo.environment}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label>{t("emailService")}</Label>
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
                  {t("refresh")}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("systemUnavailable")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsSystem;
