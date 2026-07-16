"use client";

import { Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Button } from "@/components/ui/button";
import { SitusPortalMark } from "@/components/shared/situs-portal-logo";

/** Only allow same-site relative paths, to rule out an open redirect via `callbackUrl`. */
function safeCallbackUrl(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export const dynamic = "force-dynamic";

const SUPPORTED_LOCALES = ["pt", "en", "es"] as const;

function detectLocale(): string {
  // 1. Check the referring page's path for a locale segment (/pt/, /en/, /es/)
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
  // 2. Fallback to browser language
  const browserLang = typeof navigator !== "undefined" ? navigator.language?.split("-")[0] : "pt";
  return SUPPORTED_LOCALES.includes(browserLang as (typeof SUPPORTED_LOCALES)[number])
    ? browserLang
    : "pt";
}

const isDemoEnabled =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" || process.env.NODE_ENV !== "production";

/** Full-bleed brand backdrop: brand background plus a soft teal→terracotta glow. */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-background)] px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, var(--color-primary), var(--color-accent-secondary) 60%, transparent 75%)",
        }}
      />
      {children}
    </div>
  );
}

function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl ?? `/${detectLocale()}/dashboard`);
    }
  }, [status, router, callbackUrl]);

  if (status === "loading") {
    return (
      <AuthShell>
        <div className="flex items-center gap-3 text-[var(--color-muted-foreground)]">
          <SitusPortalMark className="h-6 w-6" />
          <span className="text-sm">Loading…</span>
        </div>
      </AuthShell>
    );
  }

  if (session) {
    return null; // Will redirect via useEffect
  }

  return (
    <AuthShell>
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-solid)] p-8 shadow-2xl shadow-black/30 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <SitusPortalMark className="h-14 w-14" />
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              Welcome to Situs
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Sign in to run your rental compliance — rent, receipts, and fiscal filings for
              Portugal &amp; Spain.
            </p>
          </div>

          <div className="mt-8">
            <Button
              onClick={() => {
                const browserLang =
                  typeof navigator !== "undefined" ? navigator.language?.split("-")[0] : "pt";
                const locale = ["pt", "en", "es"].includes(browserLang) ? browserLang : "pt";
                signIn("google", { callbackUrl: callbackUrl ?? `/${locale}/dashboard` });
              }}
              variant="outline"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border-[var(--color-border-hover)] bg-[var(--color-background)] text-[15px] font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>

            {/* Credentials login — only shown when demo login is enabled */}
            {isDemoEnabled && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--color-border)]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[var(--color-card-solid)] px-3 uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      or
                    </span>
                  </div>
                </div>

                <form
                  id="demo-login-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    signIn("credentials", {
                      email: formData.get("email"),
                      password: formData.get("password"),
                      callbackUrl: callbackUrl ?? `/${detectLocale()}/dashboard`,
                    });
                  }}
                  className="space-y-3"
                >
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)]"
                    placeholder="Email"
                    defaultValue=""
                  />
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-ring)]"
                    placeholder="Password"
                    defaultValue=""
                  />
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-[var(--color-primary)] font-semibold text-[var(--color-primary-foreground)] hover:opacity-90"
                  >
                    Sign in
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 h-11 w-full rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  onClick={() => {
                    router.push(`/${detectLocale()}/demo`);
                  }}
                >
                  Explore the demo instead
                </Button>
              </>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span>Self-hosted &amp; GDPR-aligned · Portugal &amp; Spain</span>
          </div>

          {isDemoEnabled && process.env.NODE_ENV !== "production" && (
            <p className="mt-4 text-center text-xs text-[var(--color-muted-foreground)]">
              Demo mode active — enter any credentials
            </p>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

export default function SignIn() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <AuthShell>
            <div className="flex items-center gap-3 text-[var(--color-muted-foreground)]">
              <SitusPortalMark className="h-6 w-6" />
              <span className="text-sm">Loading…</span>
            </div>
          </AuthShell>
        }
      >
        <SignInContent />
      </Suspense>
    </ErrorBoundary>
  );
}
