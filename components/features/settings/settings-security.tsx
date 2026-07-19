"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/contexts/toast-context";
import { useCsrf } from "@/lib/contexts/csrf-context";

export function SettingsSecurity() {
  const { success, error: showError } = useToast();
  const { token: csrfToken } = useCsrf();

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(true);
  const [totpSetupStep, setTotpSetupStep] = useState<"idle" | "qr" | "verify" | "backup">("idle");
  const [totpQr, setTotpQr] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpBackupCodes, setTotpBackupCodes] = useState<string[]>([]);
  const [totpWorking, setTotpWorking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/totp/status");
        if (res.ok) {
          const d = await res.json();
          setTotpEnabled(d.totpEnabled ?? false);
        }
      } catch {
        // ignore
      } finally {
        setTotpLoading(false);
      }
    })();
  }, []);

  const startTotpSetup = async () => {
    setTotpWorking(true);
    try {
      const res = await fetch("/api/auth/totp/setup");
      if (!res.ok) throw new Error("Setup failed");
      const d = await res.json();
      setTotpQr(d.qrDataUrl);
      setTotpSecret(d.secret);
      setTotpCode("");
      setTotpSetupStep("qr");
    } catch {
      showError("Failed to start TOTP setup");
    } finally {
      setTotpWorking(false);
    }
  };

  const confirmTotpEnable = async () => {
    setTotpWorking(true);
    try {
      const res = await fetch("/api/auth/totp/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken || "" },
        body: JSON.stringify({ code: totpCode }),
      });
      if (!res.ok) {
        const d = await res.json();
        showError(d.error ?? "Invalid code");
        return;
      }
      const d = await res.json();
      setTotpBackupCodes(d.backupCodes);
      setTotpEnabled(true);
      setTotpSetupStep("backup");
      success("Two-factor authentication enabled");
    } catch {
      showError("Failed to enable TOTP");
    } finally {
      setTotpWorking(false);
    }
  };

  const disableTotp = async () => {
    setTotpWorking(true);
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrfToken || "" },
      });
      if (!res.ok) throw new Error("Disable failed");
      setTotpEnabled(false);
      setTotpSetupStep("idle");
      success("Two-factor authentication disabled");
    } catch {
      showError("Failed to disable TOTP");
    } finally {
      setTotpWorking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Protect your account with an authenticator app (TOTP)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {totpLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : totpEnabled && totpSetupStep !== "backup" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Two-factor authentication is enabled</span>
            </div>
            <Button variant="destructive" size="sm" onClick={disableTotp} disabled={totpWorking}>
              Disable 2FA
            </Button>
          </div>
        ) : totpSetupStep === "idle" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication adds an extra layer of security. After enabling, you will
              need your authenticator app each time you sign in.
            </p>
            <Button size="sm" onClick={startTotpSetup} disabled={totpWorking}>
              {totpWorking ? "Loading…" : "Set up 2FA"}
            </Button>
          </div>
        ) : totpSetupStep === "qr" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.),
              then enter the 6-digit code to confirm.
            </p>
            {totpQr && (
              <picture>
                <img src={totpQr} alt="TOTP QR code" className="w-48 h-48 rounded-lg" />
              </picture>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Can&apos;t scan? Enter manually
              </summary>
              <code className="block mt-2 p-2 bg-muted rounded text-xs break-all select-all">
                {totpSecret}
              </code>
            </details>
            <div className="space-y-2">
              <Label htmlFor="totp-code">Verification code</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="w-40 text-center tracking-widest text-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={confirmTotpEnable}
                disabled={totpWorking || totpCode.length !== 6}
              >
                {totpWorking ? "Verifying…" : "Enable 2FA"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTotpSetupStep("idle")}
                disabled={totpWorking}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : totpSetupStep === "backup" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Two-factor authentication has been enabled!</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Backup codes</p>
              <p className="text-sm text-muted-foreground">
                Save these codes somewhere safe. Each can be used once if you lose access to your
                authenticator app.
              </p>
              <div className="grid grid-cols-2 gap-1.5 p-3 bg-muted rounded-lg font-mono text-sm">
                {totpBackupCodes.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(totpBackupCodes.join("\n")).catch(() => {});
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy codes
              </Button>
            </div>
            <Button size="sm" onClick={() => setTotpSetupStep("idle")}>
              Done
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default SettingsSecurity;
