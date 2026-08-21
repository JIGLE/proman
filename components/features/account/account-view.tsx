"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { KeyRound, MonitorSmartphone, ShieldCheck, UserCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuditTrail } from "@/components/shared/audit-trail";

/**
 * Account — profile, security, sessions and API tokens for the signed-in owner.
 * Security management (MFA enrolment, backup codes) lives in Settings › Security;
 * this page surfaces status and links there rather than duplicating the flow.
 * Sessions and API tokens are placeholders until their backends are wired.
 */
export function AccountView(): React.ReactElement {
  const t = useTranslations("account");
  const tStatus = useTranslations("status");
  const { data: session } = useSession();

  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/totp/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled) setMfaEnabled(body?.totpEnabled ?? false);
      })
      .catch(() => {
        if (!cancelled) setMfaEnabled(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const user = session?.user;
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <p className="mono-label">{t("title")}</p>
        <h1 className="mt-1 text-2xl font-normal tracking-tight">{t("subtitle")}</h1>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            {t("profile")}
          </CardTitle>
          <CardDescription>{t("profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name || t("portalUser")}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t("security")}
          </CardTitle>
          <CardDescription>{t("securityDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t("twoFactor")}</p>
              <p className="text-sm text-muted-foreground">
                {mfaEnabled === null
                  ? t("mfaManaged")
                  : mfaEnabled
                    ? t("mfaEnabled")
                    : t("mfaDisabled")}
              </p>
            </div>
            {mfaEnabled !== null && (
              <Badge variant={mfaEnabled ? "status-success" : "status"}>
                {mfaEnabled ? t("on") : t("off")}
              </Badge>
            )}
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-none">
            <Link href={"/settings?tab=security"}>{t("manageInSettings")}</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            {t("sessions")}
          </CardTitle>
          <CardDescription>{t("sessionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 border border-[var(--color-border)] p-3">
            <div>
              <p className="text-sm font-medium">{t("thisDevice")}</p>
              <p className="mono-label mt-1">{t("currentSession")}</p>
            </div>
            <Badge variant="status-success">{tStatus("active")}</Badge>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("sessionsSoon")}</p>
        </CardContent>
      </Card>

      {/* API tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t("apiTokens")}
          </CardTitle>
          <CardDescription>{t("apiTokensDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noTokens")}</p>
        </CardContent>
      </Card>

      {/* Account-wide audit trail */}
      <div>
        <p className="mono-label mb-2">{t("activity")}</p>
        <AuditTrail emptyDescription={t("auditEmpty")} />
      </div>
    </div>
  );
}
