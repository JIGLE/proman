"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { KeyRound, MonitorSmartphone, ShieldCheck, UserCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Account — profile, security, sessions and API tokens for the signed-in owner.
 * Security management (MFA enrolment, backup codes) lives in Settings › Security;
 * this page surfaces status and links there rather than duplicating the flow.
 * Sessions and API tokens are placeholders until their backends are wired.
 */
export function AccountView(): React.ReactElement {
  const { data: session } = useSession();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt";

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
        <p className="mono-label">Account</p>
        <h1 className="mt-1 text-2xl font-normal tracking-tight">Your account</h1>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>How you appear across Situs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name || "Portal user"}</p>
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
            Security
          </CardTitle>
          <CardDescription>Password and two-factor authentication.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Two-factor authentication</p>
              <p className="text-sm text-muted-foreground">
                {mfaEnabled === null
                  ? "Managed with an authenticator app (TOTP)."
                  : mfaEnabled
                    ? "Enabled — codes required at sign-in."
                    : "Not enabled — add a second factor to protect your account."}
              </p>
            </div>
            {mfaEnabled !== null && (
              <Badge variant={mfaEnabled ? "status-success" : "status"}>
                {mfaEnabled ? "On" : "Off"}
              </Badge>
            )}
          </div>
          <Link href={`/${locale}/settings?tab=security`}>
            <Button variant="outline" size="sm" className="rounded-none">
              Manage in Settings
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            Sessions
          </CardTitle>
          <CardDescription>Devices signed in to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 border border-[var(--color-border)] p-3">
            <div>
              <p className="text-sm font-medium">This device</p>
              <p className="mono-label mt-1">Current session</p>
            </div>
            <Badge variant="status-success">Active</Badge>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Full session history and remote sign-out are coming soon.
          </p>
        </CardContent>
      </Card>

      {/* API tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            API tokens
          </CardTitle>
          <CardDescription>Programmatic access to your Situs data.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No API tokens yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
