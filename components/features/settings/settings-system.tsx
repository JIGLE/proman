"use client";

import { useEffect, useState } from "react";
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
            Tax Rules Store
          </CardTitle>
          <CardDescription>
            Manage tax brackets, withholding rates, and deductible rates by country and year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            All tax rates are stored in the database — no hard-coded values. Update rules here when
            new fiscal legislation is published.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${currentLocale}/settings/tax-rules`)}
          >
            <Landmark className="h-4 w-4 mr-1.5" />
            Open Tax Rules
          </Button>
        </CardContent>
      </Card>

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
    </div>
  );
}

export default SettingsSystem;
