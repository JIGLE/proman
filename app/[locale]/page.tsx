import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  LandingAnalyticsObserver,
  TrackedLandingLink,
} from "@/components/shared/landing-analytics";
import { SitusPortalMark } from "@/components/shared/situs-portal-logo";
import { LanguageSelector } from "@/components/shared/language-selector";
import { LandingStickyCta } from "@/components/shared/landing-sticky-cta";
import { LocaleSelectOverlay } from "@/components/shared/locale-select-overlay";
import { PwaWelcome } from "@/components/shared/pwa-welcome";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;

  // Authenticated visitors go straight to the app.
  try {
    const { getServerSession } = await import("next-auth/next");
    const { getAuthOptions } = await import("@/lib/services/auth/auth");
    const session = await getServerSession(getAuthOptions());
    if (session?.user) {
      redirect(`/${locale}/dashboard`);
    }
  } catch {
    // Session check failed — render the public landing normally.
  }

  const t = await getTranslations("landing");
  const tFooter = await getTranslations("footer");

  const chips = [
    t("chips.matching"),
    t("chips.receipts"),
    t("chips.documents"),
    t("chips.tax"),
    t("chips.palette"),
  ];

  const modules = [
    { label: t("system.m1label"), title: t("system.m1title"), body: t("system.m1body") },
    { label: t("system.m2label"), title: t("system.m2title"), body: t("system.m2body") },
    { label: t("system.m3label"), title: t("system.m3title"), body: t("system.m3body") },
  ];

  // Workflow accents follow the logo role colours (arc / line / dot), cycling.
  const flowSteps = [
    { t: t("flow.s1t"), b: t("flow.s1b"), bar: "var(--logo-primary)" },
    { t: t("flow.s2t"), b: t("flow.s2b"), bar: "var(--logo-secondary)" },
    { t: t("flow.s3t"), b: t("flow.s3b"), bar: "var(--logo-accent)" },
    { t: t("flow.s4t"), b: t("flow.s4b"), bar: "var(--logo-secondary)" },
    { t: t("flow.s5t"), b: t("flow.s5b"), bar: "var(--logo-accent)" },
  ];

  const pillars = [
    {
      label: t("pillars.portfolioLabel"),
      title: t("pillars.portfolioTitle"),
      body: t("pillars.portfolioBody"),
    },
    {
      label: t("pillars.financeLabel"),
      title: t("pillars.financeTitle"),
      body: t("pillars.financeBody"),
    },
    {
      label: t("pillars.documentsLabel"),
      title: t("pillars.documentsTitle"),
      body: t("pillars.documentsBody"),
    },
    {
      label: t("pillars.expensesLabel"),
      title: t("pillars.expensesTitle"),
      body: t("pillars.expensesBody"),
    },
    {
      label: t("pillars.operationsLabel"),
      title: t("pillars.operationsTitle"),
      body: t("pillars.operationsBody"),
    },
    {
      label: t("pillars.intelligenceLabel"),
      title: t("pillars.intelligenceTitle"),
      body: t("pillars.intelligenceBody"),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-foreground)]">
      <LocaleSelectOverlay currentLocale={locale} />

      {/* Installed-PWA visitors get an app-native welcome instead of the marketing scroll below.
          Renders null for normal browser tabs (standalone display-mode detected client-side). */}
      <PwaWelcome locale={locale} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 sm:px-10">
          <a href={`/${locale}`} className="flex items-center gap-3">
            <SitusPortalMark className="h-[34px] w-[34px]" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.22em]">Situs</span>
          </a>

          <nav className="hidden items-center gap-6 text-[13px] text-[var(--color-muted-foreground)] md:flex">
            <a href="#system" className="transition-colors hover:text-[var(--color-foreground)]">
              {t("system.eyebrow")}
            </a>
            <a href="#workflow" className="transition-colors hover:text-[var(--color-foreground)]">
              {t("flow.eyebrow")}
            </a>
            <a href="#modules" className="transition-colors hover:text-[var(--color-foreground)]">
              {t("pillars.eyebrow")}
            </a>
            <a href="#preview" className="transition-colors hover:text-[var(--color-foreground)]">
              {t("preview2.eyebrow")}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSelector compact />
            </div>
            <a
              href="/auth/signin"
              className="hidden px-3 py-2 text-[13px] font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] sm:inline-block"
            >
              {t("signIn")}
            </a>
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "header", perspective: "owner" }}
            >
              <Button size="sm" className="rounded-none font-semibold">
                {t("requestDemo")}
              </Button>
            </TrackedLandingLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px]">
        <LandingAnalyticsObserver locale={locale} demoEnabled={true} />

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid items-center gap-12 px-5 py-16 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="mono-label mb-5">{t("eyebrow")}</p>
            <h1 className="max-w-2xl text-[clamp(44px,7vw,88px)] font-normal leading-[0.9] tracking-[-0.06em]">
              {t("hero2")}
            </h1>
            <p className="mt-7 max-w-xl text-[clamp(16px,1.5vw,19px)] leading-relaxed text-[var(--color-muted-foreground)]">
              {t("subtitle2")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedLandingLink
                href={`/${locale}/demo?perspective=owner`}
                eventName="landing.demo_start"
                eventData={{ location: "hero_primary", perspective: "owner" }}
                className="w-full sm:w-auto"
              >
                <Button size="lg" className="w-full rounded-none font-semibold sm:w-auto">
                  {t("primaryCta")}
                </Button>
              </TrackedLandingLink>
              <TrackedLandingLink
                href="/auth/signup"
                eventName="landing.signup_start"
                eventData={{ location: "hero_secondary" }}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-none font-semibold sm:w-auto"
                >
                  {t("createAccount")}
                </Button>
              </TrackedLandingLink>
            </div>

            <a
              href="#workflow"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline"
            >
              {t("secondaryCta")}
            </a>

            <div className="mt-10 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Hero visual — Portal on its canvas, orbited by dashed rings, with floating KPIs */}
          <div className="relative hidden min-h-[520px] place-items-center lg:grid">
            <div
              aria-hidden
              className="absolute aspect-square w-[min(500px,80%)] rounded-full border border-dashed border-[color-mix(in_srgb,var(--logo-primary)_45%,var(--color-border))] opacity-70 motion-safe:animate-[spin_28s_linear_infinite]"
            />
            <div
              aria-hidden
              className="absolute aspect-square w-[min(400px,64%)] rounded-full border border-dashed border-[color-mix(in_srgb,var(--logo-secondary)_45%,var(--color-border))] opacity-70 motion-safe:animate-[spin_20s_linear_infinite_reverse]"
            />

            <div className="grid aspect-square w-[min(360px,74%)] place-items-center border border-[var(--color-border)] bg-[var(--logo-canvas)]">
              <SitusPortalMark className="h-[180px] w-[180px]" />
            </div>

            <div className="absolute left-0 top-14 min-w-[180px] border border-[var(--color-border)] bg-[var(--color-canvas)]/85 p-3.5 backdrop-blur-sm">
              <strong className="block text-lg font-normal tracking-tight tabular-nums">
                €4,820
              </strong>
              <span className="mono-label mt-1 block">{t("floating.income")}</span>
            </div>
            <div className="absolute bottom-24 right-0 min-w-[180px] border border-[var(--color-border)] bg-[var(--color-canvas)]/85 p-3.5 backdrop-blur-sm">
              <strong className="block text-lg font-normal tracking-tight">3 drafts</strong>
              <span className="mono-label mt-1 block">{t("floating.receipts")}</span>
            </div>
            <div className="absolute bottom-6 left-10 min-w-[180px] border border-[var(--color-border)] bg-[var(--color-canvas)]/85 p-3.5 backdrop-blur-sm">
              <strong className="block text-lg font-normal tracking-tight tabular-nums">98%</strong>
              <span className="mono-label mt-1 block">{t("floating.health")}</span>
            </div>
          </div>
        </section>

        {/* ── System architecture ──────────────────────────────── */}
        <section
          id="system"
          className="border-t border-[var(--color-border)] px-5 py-16 sm:px-10 lg:py-20"
        >
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mono-label">{t("system.eyebrow")}</p>
              <h2 className="mt-4 text-[clamp(30px,4vw,56px)] font-normal leading-[0.98] tracking-[-0.05em]">
                {t("system.title")}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[var(--color-muted-foreground)]">
                {t("system.copy")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {modules.map((m) => (
                <div
                  key={m.title}
                  className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                >
                  <span className="mono-label">{m.label}</span>
                  <h3 className="mt-4 text-xl font-normal tracking-[-0.03em]">{m.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Workflow ─────────────────────────────────────────── */}
        <section
          id="workflow"
          className="border-t border-[var(--color-border)] px-5 py-16 sm:px-10 lg:py-20"
        >
          <p className="mono-label">{t("flow.eyebrow")}</p>
          <h2 className="mt-4 text-[clamp(30px,4vw,56px)] font-normal leading-[0.98] tracking-[-0.05em]">
            {t("flow.title")}
          </h2>
          <div className="mt-8 grid gap-3 md:grid-cols-5">
            {flowSteps.map((step, i) => (
              <div
                key={step.t}
                className="relative overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: step.bar }}
                />
                <span className="mono-label">
                  {t("flow.eyebrow")} · {String(i + 1).padStart(2, "0")}
                </span>
                <strong className="mt-4 block text-lg font-normal tracking-[-0.02em]">
                  {step.t}
                </strong>
                <p className="mt-2.5 text-[13px] leading-snug text-[var(--color-muted-foreground)]">
                  {step.b}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Product pillars ──────────────────────────────────── */}
        <section
          id="modules"
          className="border-t border-[var(--color-border)] px-5 py-16 sm:px-10 lg:py-20"
        >
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mono-label">{t("pillars.eyebrow")}</p>
              <h2 className="mt-4 text-[clamp(30px,4vw,56px)] font-normal leading-[0.98] tracking-[-0.05em]">
                {t("pillars.title")}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[var(--color-muted-foreground)]">
                {t("pillars.copy")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pillars.map((p) => (
                <div
                  key={p.title}
                  className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-hover)]"
                >
                  <span className="mono-label">{p.label}</span>
                  <h3 className="mt-4 text-xl font-normal tracking-[-0.03em]">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Interface preview (static Mission Control mock-shell) ── */}
        <section
          id="preview"
          className="border-t border-[var(--color-border)] px-5 py-16 sm:px-10 lg:py-20"
        >
          <p className="mono-label">{t("preview2.eyebrow")}</p>
          <h2 className="mt-4 text-[clamp(30px,4vw,56px)] font-normal leading-[0.98] tracking-[-0.05em]">
            {t("preview2.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-muted-foreground)]">
            {t("preview2.copy")}
          </p>

          <div className="mt-9 grid min-h-[480px] grid-cols-1 border border-[var(--color-border)] bg-[var(--color-surface)] md:grid-cols-[220px_1fr]">
            {/* Rail */}
            <aside className="border-b border-[var(--color-border)] p-5 md:border-b-0 md:border-r">
              <div className="mb-7 flex items-center gap-2.5">
                <SitusPortalMark className="h-6 w-6" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em]">Situs</span>
              </div>
              <div className="grid gap-1 text-[13px]">
                <div
                  className="border-l-2 px-2.5 py-2 font-medium"
                  style={{
                    borderColor: "var(--country-highlight-readable)",
                    background: "var(--color-hover)",
                    color: "var(--country-highlight-readable)",
                  }}
                >
                  Home
                </div>
                {["Portfolio", "Finance", "Documents", "Intelligence"].map((item) => (
                  <div
                    key={item}
                    className="border-l-2 border-transparent px-2.5 py-2 text-[var(--color-muted-foreground)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </aside>

            {/* Main */}
            <section className="p-6">
              <p className="mono-label">{t("preview2.greeting")}</p>

              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {[
                  { label: t("preview2.healthLabel"), value: "98%" },
                  { label: t("preview2.incomeLabel"), value: "€4,820" },
                  { label: t("preview2.queueLabel"), value: "3" },
                ].map((kpi) => (
                  <div key={kpi.label} className="border border-[var(--color-border)] p-4">
                    <span className="mono-label">{kpi.label}</span>
                    <strong className="mt-2 block text-[26px] font-normal tabular-nums">
                      {kpi.value}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="border border-[var(--color-border)] p-4">
                  <h4 className="mono-label mb-3">{t("preview2.missionTitle")}</h4>
                  {[
                    { text: t("preview2.m1"), tag: t("preview2.m1tag") },
                    { text: t("preview2.m2"), tag: t("preview2.m2tag") },
                    { text: t("preview2.m3"), tag: t("preview2.m3tag") },
                  ].map((row) => (
                    <div
                      key={row.text}
                      className="flex justify-between gap-3 border-t border-[var(--color-border)] py-2.5 text-[13px]"
                    >
                      <span>{row.text}</span>
                      <span className="mono-label whitespace-nowrap">{row.tag}</span>
                    </div>
                  ))}
                </div>

                <div className="border border-[var(--color-border)] p-4">
                  <h4 className="mono-label mb-3">{t("preview2.timelineTitle")}</h4>
                  {[
                    { text: t("preview2.t1"), tag: t("preview2.t1tag") },
                    { text: t("preview2.t2"), tag: t("preview2.t2tag") },
                    { text: t("preview2.t3"), tag: t("preview2.t3tag") },
                  ].map((row) => (
                    <div
                      key={row.text}
                      className="flex justify-between gap-3 border-t border-[var(--color-border)] py-2.5 text-[13px]"
                    >
                      <span>{row.text}</span>
                      <span className="mono-label whitespace-nowrap">{row.tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* ── Closing CTA ──────────────────────────────────────── */}
        <section className="border-t border-[var(--color-border)] px-5 py-20 text-center sm:px-10 lg:py-28">
          <h2 className="mx-auto max-w-3xl text-[clamp(34px,6vw,72px)] font-normal leading-[0.92] tracking-[-0.06em]">
            {t("closing2.title")}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-muted-foreground)]">
            {t("closing2.copy")}
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "closing_cta", perspective: "owner" }}
              className="w-full sm:w-auto"
            >
              <Button size="lg" className="w-full rounded-none font-semibold sm:w-auto">
                {t("closing2.primary")}
              </Button>
            </TrackedLandingLink>
            <TrackedLandingLink
              href="#workflow"
              eventName="landing.workflow_cta_click"
              eventData={{ location: "closing_cta" }}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-none font-semibold sm:w-auto"
              >
                {t("closing2.secondary")}
              </Button>
            </TrackedLandingLink>
          </div>
        </section>
      </main>

      <LandingStickyCta href={`/${locale}/demo?perspective=owner`} label={t("requestDemo")} />

      <footer className="border-t border-[var(--color-border)] px-5 py-7 sm:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
          <span>{t("footer2.tagline")}</span>
          <span>{t("footer2.modules")}</span>
          <span className="flex items-center gap-3">
            <a
              href={`/${locale}/privacy`}
              className="transition-colors hover:text-[var(--color-foreground)]"
            >
              {tFooter("privacy")}
            </a>
            <span>·</span>
            <a
              href={`/${locale}/terms`}
              className="transition-colors hover:text-[var(--color-foreground)]"
            >
              {tFooter("terms")}
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
