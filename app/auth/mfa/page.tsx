"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

const SUPPORTED_LOCALES = ["pt", "en", "es"] as const;

function detectLocale(): string {
  if (typeof document !== "undefined" && document.referrer) {
    try {
      const segment = new URL(document.referrer).pathname.split("/")[1];
      if (SUPPORTED_LOCALES.includes(segment as (typeof SUPPORTED_LOCALES)[number])) {
        return segment;
      }
    } catch {
      // ignore malformed referrer
    }
  }
  const browserLang = typeof navigator !== "undefined" ? navigator.language?.split("-")[0] : "en";
  return SUPPORTED_LOCALES.includes(browserLang as (typeof SUPPORTED_LOCALES)[number])
    ? browserLang
    : "en";
}

export default function MFAPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
    // If no MFA pending, skip to dashboard
    if (
      status === "authenticated" &&
      !(session as unknown as Record<string, unknown>)?.mfaPending
    ) {
      router.replace(`/${detectLocale()}/dashboard`);
    }
  }, [status, session, router]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [useBackup]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (res.ok) {
        // Refresh the session so mfaPending clears via jwt callback re-check
        await update();
        router.replace(`/${detectLocale()}/dashboard`);
      } else {
        const data = await res.json();
        setError(data.error ?? "Invalid code");
        setCode("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-[var(--color-muted-foreground)]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <div className="max-w-sm w-full mx-4">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
              {useBackup ? (
                <KeyRound className="w-6 h-6 text-[var(--color-muted-foreground)]" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-[var(--color-muted-foreground)]" />
              )}
            </div>
            <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
              Two-factor authentication
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {useBackup
                ? "Enter one of your backup codes"
                : "Enter the 6-digit code from your authenticator app"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-[var(--color-muted-foreground)] text-sm">
                {useBackup ? "Backup code" : "Authentication code"}
              </Label>
              <Input
                ref={inputRef}
                id="code"
                type="text"
                inputMode={useBackup ? "text" : "numeric"}
                autoComplete="one-time-code"
                placeholder={useBackup ? "XXXXXXXX" : "000000"}
                maxLength={useBackup ? 8 : 6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
                className="bg-[var(--color-surface)] border-[var(--color-border-hover)] text-[var(--color-foreground)] text-center text-lg tracking-widest placeholder:text-[var(--color-muted-foreground)]"
              />
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <Button
              type="submit"
              disabled={loading || code.length < (useBackup ? 8 : 6)}
              className="w-full bg-zinc-100 text-zinc-900 hover:bg-white"
            >
              {loading ? "Verifying…" : "Verify"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setUseBackup((v) => !v);
                setCode("");
                setError("");
              }}
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-muted-foreground)] transition-colors"
            >
              {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
