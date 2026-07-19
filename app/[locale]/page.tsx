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
    <div className="min-h-screen bg-[#09090e] text-[var(--color-foreground)]">
      <LocaleSelectOverlay currentLocale={locale} />

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
            {/* Language is reachable on every breakpoint (compact on mobile) */}
            <LanguageSelector compact />
            <div className="hidden sm:block h-4 w-px bg-white/10" />
            <TrackedLandingLink
              href="/auth/signin"
              eventName="landing.signin_click"
              eventData={{ location: "header" }}
              className="hidden sm:block"
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              >
                {t("cta")}
              </Button>
            </TrackedLandingLink>
            {/* Primary CTA — visible on mobile too, not just below the fold */}
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "header" }}
            >
              <Button size="sm" className="gap-1.5 bg-teal-600 text-white hover:bg-teal-500">
                <Play className="h-3.5 w-3.5" />
                {t("demoCta")}
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

            <LandingHeroItem>
              <h1 className="font-display text-[40px] font-bold leading-[1.08] tracking-[-0.04em] text-[var(--color-foreground)] sm:text-5xl">
                {t("hero")}
              </h1>
            </LandingHeroItem>

            <LandingHeroItem>
              <p className="max-w-md text-[16px] leading-relaxed text-[var(--color-muted-foreground)]">
                {t("subtitle")}
              </p>
            </LandingHeroItem>

            <LandingHeroItem>
              {/* Three-way entry: one bounded choice set (Hick's Law). Demo is
                  emphasized as the lowest-friction path to value; landlord and
                  tenant are equal-weight peers so each user self-selects their door. */}
              <div role="group" aria-label={t("entryHeading")} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-muted-foreground)]">
                  {t("entryHeading")}
                </p>

                <TrackedLandingLink
                  href={`/${locale}/demo?perspective=owner`}
                  eventName="landing.demo_start"
                  eventData={{ location: "hero_entry", perspective: "owner" }}
                  className="block"
                >
                  <div className="group flex items-center gap-3 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 transition-colors hover:bg-teal-500/15">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
                      <Play className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        {t("entryDemo")}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {t("entryDemoDesc")}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-teal-300 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </TrackedLandingLink>

                <div className="grid gap-2 sm:grid-cols-2">
                  <TrackedLandingLink
                    href="/auth/signin"
                    eventName="landing.signin_click"
                    eventData={{ location: "hero_entry", role: "landlord" }}
                    className="block"
                  >
                    <div className="group flex h-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[var(--color-card)]/60 px-4 py-3 transition-colors hover:border-white/[0.16] hover:bg-[var(--color-card)]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[var(--color-foreground)]">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--color-foreground)]">
                          {t("entryLandlord")}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {t("entryLandlordDesc")}
                        </p>
                      </div>
                    </div>
                  </TrackedLandingLink>

                  <TrackedLandingLink
                    href="/tenant-portal"
                    eventName="landing.tenant_portal_click"
                    eventData={{ location: "hero_entry", role: "tenant" }}
                    className="block"
                  >
                    <div className="group flex h-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[var(--color-card)]/60 px-4 py-3 transition-colors hover:border-white/[0.16] hover:bg-[var(--color-card)]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[var(--color-foreground)]">
                        <Users className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--color-foreground)]">
                          {t("entryTenant")}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {t("entryTenantDesc")}
                        </p>
                      </div>
                    </div>
                  </TrackedLandingLink>
                </div>

                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-sm text-[var(--color-muted-foreground)]">
                  <span>{t("microcopy")}</span>
                  <TrackedLandingLink
                    href="#workflow"
                    eventName="landing.workflow_cta_click"
                    eventData={{ location: "hero_secondary" }}
                    className="inline-flex items-center gap-1 text-[var(--color-foreground)] underline-offset-4 transition-colors hover:underline"
                  >
                    {t("secondaryCta")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </TrackedLandingLink>
                </p>
              </div>
            </LandingHeroItem>
          </LandingHero>

          {/* â”€â”€ Compact product preview (mobile/tablet) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="lg:hidden">
            <div className="rounded-2xl border border-white/[0.08] bg-[var(--color-card)]/70 p-4 shadow-xl shadow-black/40">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--color-muted-foreground)]">
                  {t("preview.label")}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t("preview.badge")}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/[0.05] bg-[var(--color-background)] px-3 py-3">
                  <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    {t("preview.kpi.overdueLabel")}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-red-400">
                    EUR 950
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-[var(--color-background)] px-3 py-3">
                  <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    {t("preview.kpi.collectedLabel")}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-[var(--color-foreground)]">
                    EUR 3 800
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-[var(--color-background)] px-3 py-3">
                  <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    {t("preview.kpi.receiptsLabel")}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-[var(--color-foreground)]">
                    4 / 5
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* â”€â”€ Product Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="relative hidden lg:block">
            <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[48px] bg-teal-600/5 blur-3xl" />

            <div className="rounded-[22px] border border-white/[0.08] bg-[var(--color-card)]/80 p-3 shadow-2xl shadow-black/60 ring-1 ring-white/[0.03]">
              <div className="overflow-hidden rounded-[16px] border border-white/[0.05] bg-[var(--color-background)]">
                {/* Chrome bar */}
                <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[var(--color-surface)]" />
                      <div className="h-2 w-2 rounded-full bg-[var(--color-surface)]" />
                      <div className="h-2 w-2 rounded-full bg-[var(--color-surface)]" />
                    </div>
                    <div className="h-3.5 w-px bg-[var(--color-surface)]" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--color-muted-foreground)]">
                      {t("preview.label")}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {t("preview.badge")}
                  </span>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-3 divide-x divide-white/[0.04] border-b border-white/[0.04]">
                  <div className="px-4 py-4">
                    <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {t("preview.kpi.overdueLabel")}
                    </p>
                    <p className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-red-400">
                      EUR 950
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                      {t("preview.kpi.overdueHint")}
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {t("preview.kpi.collectedLabel")}
                    </p>
                    <p className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-[var(--color-foreground)]">
                      EUR 3 800
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                      {t("preview.kpi.collectedHint")}
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      {t("preview.kpi.receiptsLabel")}
                    </p>
                    <p className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-[var(--color-foreground)]">
                      4 / 5
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                      {t("preview.kpi.receiptsHint")}
                    </p>
                  </div>
                </div>

                {/* Active workflow steps */}
                <div className="space-y-1.5 p-4">
                  <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    {t("preview.title")}
                  </p>

                  {/* Step 1 â€” active */}
                  <div className="flex items-center gap-3 rounded-xl bg-[var(--color-card)] px-3.5 py-3 ring-1 ring-red-500/20">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-bold text-red-400">
                      1
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold leading-tight text-[var(--color-foreground)]">
                        {t("preview.steps.detect.title")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                        {t("preview.steps.detect.description")}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums text-red-400">
                      EUR 950
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3 rounded-xl bg-[var(--color-card)]/60 px-3.5 py-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-[10px] font-bold text-teal-400">
                      2
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-tight text-[var(--color-muted-foreground)]">
                        {t("preview.steps.receipt.title")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                        {t("preview.steps.receipt.description")}
                      </p>
                    </div>
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-teal-400/50" />
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-3 rounded-xl bg-[var(--color-card)]/60 px-3.5 py-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
                      3
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-tight text-[var(--color-muted-foreground)]">
                        {t("preview.steps.compliance.title")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                        {t("preview.steps.compliance.description")}
                      </p>
                    </div>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400/50" />
                  </div>
                </div>

                {/* Result footer */}
                <div className="flex items-center justify-between border-t border-white/[0.04] bg-[var(--color-card)]/30 px-4 py-2.5">
                  <div className="flex items-center gap-3 text-[10px] text-[var(--color-muted-foreground)]">
                    <span>
                      {t("preview.result.receipt")}:{" "}
                      <span className="text-[var(--color-muted-foreground)]">
                        {t("preview.result.done")}
                      </span>
                    </span>
                    <span className="h-2.5 w-px bg-[var(--color-surface)]" />
                    <span>
                      {t("preview.result.export")}:{" "}
                      <span className="text-[var(--color-muted-foreground)]">
                        {t("preview.result.ready")}
                      </span>
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold tracking-wide text-[var(--color-muted-foreground)]">
                    PT / ES
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* â”€â”€ Trust Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mx-auto mt-16 max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            {trustItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* â”€â”€ Features â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="mx-auto mt-24 max-w-6xl">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              {t("features.eyebrow")}
            </p>
            <h2 className="font-display mt-4 text-[28px] font-bold tracking-[-0.02em] text-[var(--color-foreground)] sm:text-3xl">
              {t("features.title")}
            </h2>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Primary: Rent Collection â€” spans 2 cols */}
            <div className="space-y-4 rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-950/25 to-zinc-900/60 p-6 sm:col-span-2">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-teal-500/15 p-2.5">
                  <AlarmClock className="h-5 w-5 text-teal-400" />
                </div>
                <span className="rounded-full border border-teal-500/20 bg-teal-500/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-400">
                  {t("features.primaryBadge")}
                </span>
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--color-foreground)]">
                  {t("features.items.rentCollection.title")}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted-foreground)]">
                  {t("features.items.rentCollection.description")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-teal-400">
                {t("features.primaryCta")} <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Instant Receipts */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-[var(--color-card)]/50 p-5">
              <div className="w-fit rounded-lg bg-[var(--color-surface)]/70 p-2">
                <ReceiptText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              </div>
              <p className="text-[15px] font-semibold text-[var(--color-foreground)]">
                {t("features.items.receipts.title")}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("features.items.receipts.description")}
              </p>
            </div>

            {/* Tax Compliance */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-[var(--color-card)]/50 p-5">
              <div className="w-fit rounded-lg bg-[var(--color-surface)]/70 p-2">
                <ShieldCheck className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              </div>
              <p className="text-[15px] font-semibold text-[var(--color-foreground)]">
                {t("features.items.taxCompliance.title")}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("features.items.taxCompliance.description")}
              </p>
            </div>

            {/* Maintenance */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-[var(--color-card)]/50 p-5">
              <div className="w-fit rounded-lg bg-[var(--color-surface)]/70 p-2">
                <Wrench className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              </div>
              <p className="text-[15px] font-semibold text-[var(--color-foreground)]">
                {t("features.items.maintenance.title")}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("features.items.maintenance.description")}
              </p>
            </div>

            {/* Lease Management */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-[var(--color-card)]/50 p-5">
              <div className="w-fit rounded-lg bg-[var(--color-surface)]/70 p-2">
                <ScrollText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              </div>
              <p className="text-[15px] font-semibold text-[var(--color-foreground)]">
                {t("features.items.leaseManagement.title")}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("features.items.leaseManagement.description")}
              </p>
            </div>

            {/* Tenant Portal â€” full width */}
            <div className="rounded-2xl border border-white/[0.06] bg-[var(--color-card)]/50 p-5 sm:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-4">
                <div className="w-fit shrink-0 rounded-lg bg-[var(--color-surface)]/70 p-2">
                  <Users className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[var(--color-foreground)]">
                    {t("features.items.tenantPortal.title")}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                    {t("features.items.tenantPortal.description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Product pillars ──────────────────────────────────── */}
        <section
          id="modules"
          className="border-t border-[var(--color-border)] px-5 py-16 sm:px-10 lg:py-20"
        >
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              {t("timeline.eyebrow")}
            </p>
            <h2 className="font-display mt-4 text-[26px] font-bold tracking-[-0.02em] text-[var(--color-foreground)] sm:text-[28px]">
              {t("timeline.title")}
            </h2>
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
              {t("timeline.subtitle")}
            </p>
          </div>

          {/* Desktop: horizontal */}
          <div className="relative mt-12 hidden items-start md:flex">
            <div className="absolute left-[9%] right-[9%] top-5 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
            {timelineSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={p.title}
                  className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-hover)]"
                >
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)] shadow-lg shadow-black/40">
                    <Icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <p className="mt-4 text-[13px] font-semibold text-[var(--color-foreground)]">
                    {step.title}
                  </p>
                  <p className="mt-1 max-w-[110px] text-[11px] leading-snug text-[var(--color-muted-foreground)]">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical */}
          <div className="mt-8 md:hidden">
            {timelineSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)]">
                      <Icon className={`h-3.5 w-3.5 ${step.color}`} />
                    </div>
                    {i < timelineSteps.length - 1 && (
                      <div className="my-1 min-h-[24px] w-px flex-1 bg-[var(--color-surface)]/60" />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--color-muted-foreground)]">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Interface preview (static Mission Control mock-shell) ── */}
        <section
          id="how-it-works"
          className="mx-auto mt-6 max-w-6xl rounded-3xl border border-white/[0.05] bg-[var(--color-card)]/50 p-8 sm:p-10"
        >
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              {t("howItWorks.eyebrow")}
            </p>
            <h2 className="font-display mt-4 text-[26px] font-bold tracking-[-0.02em] text-[var(--color-foreground)] sm:text-[28px]">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-muted-foreground)]">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.key}
                  className="rounded-2xl border border-white/[0.05] bg-[var(--color-background)]/60 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-[var(--color-surface)]/80 p-2">
                      <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    </div>
                    <span className="text-[11px] font-bold tracking-[0.2em] text-[var(--color-muted-foreground)]">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-4 text-[15px] font-semibold text-[var(--color-foreground)]">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "how_it_works_cta", perspective: "owner" }}
            >
              <Button
                size="lg"
                className="gap-2 bg-teal-600 font-semibold text-white shadow-lg shadow-teal-950 hover:bg-teal-500"
              >
                <Play className="h-4 w-4" />
                {t("demoCta")}
              </Button>
            </TrackedLandingLink>
          </div>
        </section>

        {/* â”€â”€ Demo Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="mx-auto mt-16 max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
              {t("demo.label")}
            </p>
            <h2 className="font-display mt-4 text-[26px] font-bold tracking-[-0.02em] text-[var(--color-foreground)]">
              {t("demo.title")}
            </h2>
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
              {t("demo.subtitle")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Owner â€” operational, portfolio-focused */}
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "demo_card", perspective: "owner" }}
              className="group rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)]/70 p-6 transition-all hover:border-[var(--color-border-hover)] hover:bg-[var(--color-card)]"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <ShieldCheck className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors group-hover:text-[var(--color-muted-foreground)]">
                  {t("demo.cardCta")} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <h3 className="mt-5 text-lg font-bold text-[var(--color-foreground)]">
                {t("demo.ownerTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {t("demo.ownerDescription")}
              </p>
              <div className="mt-5 space-y-2">
                {[t("demo.owner.f1"), t("demo.owner.f2"), t("demo.owner.f3")].map((f) => (
                  <div
                    key={f}
                    className="flex items-center gap-2 text-[13px] text-[var(--color-muted-foreground)]"
                  >
                    <div className="h-1 w-1 shrink-0 rounded-full bg-[var(--color-muted)]" />
                    {f}
                  </div>
                ))}
              </div>
            </TrackedLandingLink>

            {/* Tenant â€” simplified, self-service */}
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=tenant`}
              eventName="landing.demo_start"
              eventData={{ location: "demo_card", perspective: "tenant" }}
              className="group rounded-[22px] border border-teal-500/20 bg-gradient-to-br from-teal-950/20 to-zinc-900/50 p-6 transition-all hover:border-teal-500/35"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl border border-teal-500/25 bg-teal-500/10 p-3">
                  <KeyRound className="h-5 w-5 text-teal-400" />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors group-hover:text-teal-400">
                  {t("demo.cardCta")} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <h3 className="mt-5 text-lg font-bold text-[var(--color-foreground)]">
                {t("demo.tenantTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {t("demo.tenantDescription")}
              </p>
              <div className="mt-5 space-y-2">
                {[t("demo.tenant.f1"), t("demo.tenant.f2"), t("demo.tenant.f3")].map((f) => (
                  <div
                    key={f}
                    className="flex items-center gap-2 text-[13px] text-[var(--color-muted-foreground)]"
                  >
                    <div className="h-1 w-1 shrink-0 rounded-full bg-teal-600/50" />
                    {f}
                  </div>
                ))}
              </div>
            </TrackedLandingLink>
          </div>
        </section>

        {/* â”€â”€ Closing CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="mx-auto mt-28 max-w-6xl px-4">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-300">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              {t("pricing.eyebrow")}
            </div>
            <h2 className="font-display mt-4 text-[28px] font-bold tracking-[-0.03em] text-[var(--color-foreground)] sm:text-4xl">
              {t("pricing.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--color-muted-foreground)]">
              {t("pricing.subtitle")}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-[var(--color-card)]/40 p-6">
              <p className="text-sm font-semibold text-[var(--color-muted-foreground)]">
                {t("pricing.free.name")}
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-[var(--color-foreground)]">
                  {t("pricing.free.price")}
                </span>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {t("pricing.monthly")}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-[var(--color-muted-foreground)]">
                {t("pricing.free.description")}
              </p>
              <ul className="my-6 flex-1 space-y-3">
                {[
                  t("pricing.free.f1"),
                  t("pricing.free.f2"),
                  t("pricing.free.f3"),
                  t("pricing.free.f4"),
                  t("pricing.free.f5"),
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[13px] text-[var(--color-muted-foreground)]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <TrackedLandingLink
                href="/auth/signin"
                eventName="landing.pricing_cta"
                eventData={{ plan: "free" }}
              >
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-[var(--color-muted-foreground)] hover:bg-white/5 hover:text-[var(--color-foreground)]"
                >
                  {t("pricing.free.cta")}
                </Button>
              </TrackedLandingLink>
            </div>

            {/* Pro — highlighted */}
            <div className="relative flex flex-col rounded-2xl border border-teal-500/40 bg-gradient-to-b from-teal-950/40 to-zinc-900/60 p-6 shadow-xl shadow-teal-950/30">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-3 py-0.5 text-[11px] font-semibold text-white">
                {t("pricing.pro.badge")}
              </span>
              <p className="text-sm font-semibold text-teal-300">{t("pricing.pro.name")}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-[var(--color-foreground)]">
                  {t("pricing.pro.price")}
                </span>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {t("pricing.monthly")}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-[var(--color-muted-foreground)]">
                {t("pricing.pro.description")}
              </p>
              <ul className="my-6 flex-1 space-y-3">
                {[
                  t("pricing.pro.f1"),
                  t("pricing.pro.f2"),
                  t("pricing.pro.f3"),
                  t("pricing.pro.f4"),
                  t("pricing.pro.f5"),
                  t("pricing.pro.f6"),
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[13px] text-[var(--color-muted-foreground)]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <TrackedLandingLink
                href={`/${locale}/demo?perspective=owner`}
                eventName="landing.pricing_cta"
                eventData={{ plan: "pro" }}
              >
                <Button className="w-full bg-teal-600 font-semibold text-white hover:bg-teal-500">
                  {t("pricing.pro.cta")}
                </Button>
              </TrackedLandingLink>
            </div>

            {/* Business */}
            <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-[var(--color-card)]/40 p-6">
              <p className="text-sm font-semibold text-[var(--color-muted-foreground)]">
                {t("pricing.business.name")}
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-[var(--color-foreground)]">
                  {t("pricing.business.price")}
                </span>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {t("pricing.monthly")}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-[var(--color-muted-foreground)]">
                {t("pricing.business.description")}
              </p>
              <ul className="my-6 flex-1 space-y-3">
                {[
                  t("pricing.business.f1"),
                  t("pricing.business.f2"),
                  t("pricing.business.f3"),
                  t("pricing.business.f4"),
                  t("pricing.business.f5"),
                  t("pricing.business.f6"),
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-[13px] text-[var(--color-muted-foreground)]"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:hello@proman.app">
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-[var(--color-muted-foreground)] hover:bg-white/5 hover:text-[var(--color-foreground)]"
                >
                  {t("pricing.business.cta")}
                </Button>
              </a>
            </div>
          </div>

          <p className="mt-8 text-center text-[13px] text-[var(--color-muted-foreground)]">
            {t("pricing.selfHostedNote")}{" "}
            <a
              href="https://github.com/JIGLE/proman"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--color-muted-foreground)] hover:underline"
            >
              {t("pricing.selfHostedLink")}
            </a>
          </p>
        </section>

        <section className="mx-auto mt-28 max-w-lg px-4 text-center">
          <h2 className="font-display text-[28px] font-bold tracking-[-0.02em] text-[var(--color-foreground)] sm:text-3xl">
            {t("closingCta.title")}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-muted-foreground)]">
            {t("closingCta.subtitle")}
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
                variant="ghost"
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              >
                {t("closingCta.secondary")}
              </Button>
            </TrackedLandingLink>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-white/[0.04] px-4 py-10">
        <div className="mx-auto max-w-6xl text-center text-sm text-[var(--color-muted-foreground)]">
          <p>{tFooter("copyright", { year: new Date().getFullYear().toString() })}</p>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-[var(--color-muted-foreground)]">
            <a
              href={`/${locale}/privacy`}
              className="transition-colors hover:text-[var(--color-muted-foreground)]"
            >
              {tFooter("privacy")}
            </a>
            <span>Â·</span>
            <a
              href={`/${locale}/terms`}
              className="transition-colors hover:text-[var(--color-muted-foreground)]"
            >
              {tFooter("terms")}
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
