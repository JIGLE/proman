import { redirect } from "next/navigation";
import {
  AlarmClock,
  ArrowRight,
  BadgeEuro,
  Bell,
  Building2,
  CheckCircle2,
  Globe2,
  KeyRound,
  Play,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import {
  LandingAnalyticsObserver,
  TrackedLandingLink,
} from "@/components/shared/landing-analytics";
import { LanguageSelector } from "@/components/shared/language-selector";
import { LandingHero, LandingHeroItem } from "@/components/shared/landing-hero";
import { LocaleSelectOverlay } from "@/components/shared/locale-select-overlay";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;

  // If user is authenticated, redirect to dashboard instead of landing page
  try {
    const { getServerSession } = await import("next-auth/next");
    const { getAuthOptions } = await import("@/lib/services/auth/auth");
    const session = await getServerSession(getAuthOptions());
    if (session?.user) {
      redirect(`/${locale}/dashboard`);
    }
  } catch {
    // If session check fails, show landing page normally
  }

  const t = await getTranslations("landing");
  const tFooter = await getTranslations("footer");

  const trustItems = [
    t("trust.items.records"),
    t("trust.items.export"),
    t("trust.items.pt_es"),
    t("trust.items.roles"),
    t("trust.items.documents"),
    t("trust.items.operations"),
  ];

  const timelineSteps = [
    {
      icon: AlarmClock,
      color: "text-red-400",
      title: t("timeline.steps.due.title"),
      description: t("timeline.steps.due.description"),
    },
    {
      icon: Bell,
      color: "text-amber-400",
      title: t("timeline.steps.reminder.title"),
      description: t("timeline.steps.reminder.description"),
    },
    {
      icon: BadgeEuro,
      color: "text-indigo-400",
      title: t("timeline.steps.payment.title"),
      description: t("timeline.steps.payment.description"),
    },
    {
      icon: ReceiptText,
      color: "text-violet-400",
      title: t("timeline.steps.receipt.title"),
      description: t("timeline.steps.receipt.description"),
    },
    {
      icon: Globe2,
      color: "text-emerald-400",
      title: t("timeline.steps.export.title"),
      description: t("timeline.steps.export.description"),
    },
  ];

  const howItWorksSteps = [
    {
      key: "collect",
      icon: AlarmClock,
      title: t("howItWorks.collect.title"),
      description: t("howItWorks.collect.description"),
    },
    {
      key: "issue",
      icon: ReceiptText,
      title: t("howItWorks.issue.title"),
      description: t("howItWorks.issue.description"),
    },
    {
      key: "report",
      icon: Globe2,
      title: t("howItWorks.report.title"),
      description: t("howItWorks.report.description"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090e] text-zinc-50">
      <LocaleSelectOverlay currentLocale={locale} />

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#09090e]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-500" />
            <span className="text-lg font-semibold tracking-tight">Proman</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>
            <div className="hidden sm:block h-4 w-px bg-white/10" />
            <div className="hidden sm:block">
              <TrackedLandingLink
                href="/auth/signin"
                eventName="landing.signin_click"
                eventData={{ location: "header" }}
              >
                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-zinc-50">
                  {t("cta")}
                </Button>
              </TrackedLandingLink>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 pb-24 pt-28">
        <LandingAnalyticsObserver locale={locale} demoEnabled={true} />

        {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <LandingHero>
            <LandingHeroItem>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                {t("eyebrow")}
              </div>
            </LandingHeroItem>

            <LandingHeroItem>
              <h1 className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em] text-zinc-50 sm:text-5xl">
                {t("hero")}
              </h1>
            </LandingHeroItem>

            <LandingHeroItem>
              <p className="max-w-md text-[16px] leading-relaxed text-zinc-400">{t("subtitle")}</p>
            </LandingHeroItem>

            <LandingHeroItem>
              <div className="flex flex-wrap gap-3">
                <TrackedLandingLink
                  href={`/${locale}/demo?perspective=owner`}
                  eventName="landing.demo_start"
                  eventData={{ location: "hero_primary", perspective: "owner" }}
                >
                  <Button
                    size="xl"
                    className="h-11 gap-2 bg-indigo-600 px-7 text-[15px] font-semibold text-white shadow-lg shadow-indigo-950 hover:bg-indigo-500"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t("demoCta")}
                  </Button>
                </TrackedLandingLink>
                <TrackedLandingLink
                  href="#workflow"
                  eventName="landing.workflow_cta_click"
                  eventData={{ location: "hero_secondary" }}
                >
                  <Button
                    size="xl"
                    variant="ghost"
                    className="h-11 gap-2 px-5 text-[15px] text-zinc-400 hover:text-zinc-100"
                  >
                    {t("secondaryCta")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </TrackedLandingLink>
              </div>
            </LandingHeroItem>

            <LandingHeroItem>
              <div className="space-y-1.5">
                <p className="text-sm text-zinc-500">{t("microcopy")}</p>
                <p className="text-sm text-zinc-500">
                  {t("tenantPortalNote")}{" "}
                  <a
                    href="/tenant-portal"
                    className="text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-200 hover:underline"
                  >
                    {t("tenantPortalLink")} â†’
                  </a>
                </p>
              </div>
            </LandingHeroItem>
          </LandingHero>

          {/* â”€â”€ Product Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="relative hidden lg:block">
            <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[48px] bg-indigo-600/5 blur-3xl" />

            <div className="rounded-[22px] border border-white/[0.08] bg-zinc-900/80 p-3 shadow-2xl shadow-black/60 ring-1 ring-white/[0.03]">
              <div className="overflow-hidden rounded-[16px] border border-white/[0.05] bg-zinc-950">
                {/* Chrome bar */}
                <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-zinc-800" />
                      <div className="h-2 w-2 rounded-full bg-zinc-800" />
                      <div className="h-2 w-2 rounded-full bg-zinc-800" />
                    </div>
                    <div className="h-3.5 w-px bg-zinc-800" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
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
                    <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                      {t("preview.kpi.overdueLabel")}
                    </p>
                    <p className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-red-400">
                      EUR 950
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {t("preview.kpi.overdueHint")}
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                      {t("preview.kpi.collectedLabel")}
                    </p>
                    <p className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-zinc-100">
                      EUR 3 800
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {t("preview.kpi.collectedHint")}
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                      {t("preview.kpi.receiptsLabel")}
                    </p>
                    <p className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-zinc-100">
                      4 / 5
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {t("preview.kpi.receiptsHint")}
                    </p>
                  </div>
                </div>

                {/* Active workflow steps */}
                <div className="space-y-1.5 p-4">
                  <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                    {t("preview.title")}
                  </p>

                  {/* Step 1 â€” active */}
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-900 px-3.5 py-3 ring-1 ring-red-500/20">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-bold text-red-400">
                      1
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold leading-tight text-zinc-100">
                        {t("preview.steps.detect.title")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        {t("preview.steps.detect.description")}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums text-red-400">
                      EUR 950
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 px-3.5 py-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[10px] font-bold text-indigo-400">
                      2
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-tight text-zinc-300">
                        {t("preview.steps.receipt.title")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-600">
                        {t("preview.steps.receipt.description")}
                      </p>
                    </div>
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-400/50" />
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 px-3.5 py-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
                      3
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-tight text-zinc-300">
                        {t("preview.steps.compliance.title")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-600">
                        {t("preview.steps.compliance.description")}
                      </p>
                    </div>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400/50" />
                  </div>
                </div>

                {/* Result footer */}
                <div className="flex items-center justify-between border-t border-white/[0.04] bg-zinc-900/30 px-4 py-2.5">
                  <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                    <span>
                      {t("preview.result.receipt")}:{" "}
                      <span className="text-zinc-400">{t("preview.result.done")}</span>
                    </span>
                    <span className="h-2.5 w-px bg-zinc-800" />
                    <span>
                      {t("preview.result.export")}:{" "}
                      <span className="text-zinc-400">{t("preview.result.ready")}</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold tracking-wide text-zinc-600">
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
              <div key={item} className="flex items-center gap-2 text-sm text-zinc-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-zinc-700" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* â”€â”€ Features â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="mx-auto mt-24 max-w-6xl">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
              {t("features.eyebrow")}
            </p>
            <h2 className="mt-4 text-[28px] font-bold tracking-[-0.02em] text-zinc-50 sm:text-3xl">
              {t("features.title")}
            </h2>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Primary: Rent Collection â€” spans 2 cols */}
            <div className="space-y-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/25 to-zinc-900/60 p-6 sm:col-span-2">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-indigo-500/15 p-2.5">
                  <AlarmClock className="h-5 w-5 text-indigo-400" />
                </div>
                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-400">
                  {t("features.primaryBadge")}
                </span>
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-50">
                  {t("features.items.rentCollection.title")}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
                  {t("features.items.rentCollection.description")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-400">
                {t("features.primaryCta")} <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Instant Receipts */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-5">
              <div className="w-fit rounded-lg bg-zinc-800/70 p-2">
                <ReceiptText className="h-4 w-4 text-zinc-300" />
              </div>
              <p className="text-[15px] font-semibold text-zinc-100">
                {t("features.items.receipts.title")}
              </p>
              <p className="text-sm text-zinc-500">{t("features.items.receipts.description")}</p>
            </div>

            {/* Tax Compliance */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-5">
              <div className="w-fit rounded-lg bg-zinc-800/70 p-2">
                <ShieldCheck className="h-4 w-4 text-zinc-300" />
              </div>
              <p className="text-[15px] font-semibold text-zinc-100">
                {t("features.items.taxCompliance.title")}
              </p>
              <p className="text-sm text-zinc-500">
                {t("features.items.taxCompliance.description")}
              </p>
            </div>

            {/* Maintenance */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-5">
              <div className="w-fit rounded-lg bg-zinc-800/70 p-2">
                <Wrench className="h-4 w-4 text-zinc-300" />
              </div>
              <p className="text-[15px] font-semibold text-zinc-100">
                {t("features.items.maintenance.title")}
              </p>
              <p className="text-sm text-zinc-500">{t("features.items.maintenance.description")}</p>
            </div>

            {/* Lease Management */}
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-5">
              <div className="w-fit rounded-lg bg-zinc-800/70 p-2">
                <ScrollText className="h-4 w-4 text-zinc-300" />
              </div>
              <p className="text-[15px] font-semibold text-zinc-100">
                {t("features.items.leaseManagement.title")}
              </p>
              <p className="text-sm text-zinc-500">
                {t("features.items.leaseManagement.description")}
              </p>
            </div>

            {/* Tenant Portal â€” full width */}
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-5 sm:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-4">
                <div className="w-fit shrink-0 rounded-lg bg-zinc-800/70 p-2">
                  <Users className="h-4 w-4 text-zinc-300" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-zinc-100">
                    {t("features.items.tenantPortal.title")}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {t("features.items.tenantPortal.description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* â”€â”€ Workflow Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section
          id="workflow"
          className="mx-auto mt-16 max-w-6xl overflow-hidden rounded-3xl px-6 py-12 sm:px-10"
          style={{
            background:
              "radial-gradient(ellipse at 50% -10%, rgba(59,130,246,0.08) 0%, transparent 60%), #0d0d14",
          }}
        >
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
              {t("timeline.eyebrow")}
            </p>
            <h2 className="mt-4 text-[26px] font-bold tracking-[-0.02em] text-zinc-50 sm:text-[28px]">
              {t("timeline.title")}
            </h2>
            <p className="mt-3 text-sm text-zinc-500">{t("timeline.subtitle")}</p>
          </div>

          {/* Desktop: horizontal */}
          <div className="relative mt-12 hidden items-start md:flex">
            <div className="absolute left-[9%] right-[9%] top-5 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
            {timelineSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative flex flex-1 flex-col items-center px-3 text-center"
                >
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 shadow-lg shadow-black/40">
                    <Icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <p className="mt-4 text-[13px] font-semibold text-zinc-200">{step.title}</p>
                  <p className="mt-1 max-w-[110px] text-[11px] leading-snug text-zinc-600">
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950">
                      <Icon className={`h-3.5 w-3.5 ${step.color}`} />
                    </div>
                    {i < timelineSteps.length - 1 && (
                      <div className="my-1 min-h-[24px] w-px flex-1 bg-zinc-800/60" />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className="text-[13px] font-semibold text-zinc-200">{step.title}</p>
                    <p className="mt-0.5 text-[12px] text-zinc-500">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* â”€â”€ How It Works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section
          id="how-it-works"
          className="mx-auto mt-6 max-w-6xl rounded-3xl border border-white/[0.05] bg-zinc-900/50 p-8 sm:p-10"
        >
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
              {t("howItWorks.eyebrow")}
            </p>
            <h2 className="mt-4 text-[26px] font-bold tracking-[-0.02em] text-zinc-50 sm:text-[28px]">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.key}
                  className="rounded-2xl border border-white/[0.05] bg-zinc-950/60 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-zinc-800/80 p-2">
                      <Icon className="h-4 w-4 text-zinc-400" />
                    </div>
                    <span className="text-[11px] font-bold tracking-[0.2em] text-zinc-700">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-4 text-[15px] font-semibold text-zinc-100">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.description}</p>
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
                className="gap-2 bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-950 hover:bg-indigo-500"
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
              {t("demo.label")}
            </p>
            <h2 className="mt-4 text-[26px] font-bold tracking-[-0.02em] text-zinc-50">
              {t("demo.title")}
            </h2>
            <p className="mt-3 text-sm text-zinc-500">{t("demo.subtitle")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Owner â€” operational, portfolio-focused */}
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "demo_card", perspective: "owner" }}
              className="group rounded-[22px] border border-zinc-800 bg-zinc-900/70 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl border border-zinc-700/50 bg-zinc-800 p-3">
                  <ShieldCheck className="h-5 w-5 text-zinc-300" />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-zinc-600 transition-colors group-hover:text-zinc-300">
                  {t("demo.cardCta")} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <h3 className="mt-5 text-lg font-bold text-zinc-50">{t("demo.ownerTitle")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {t("demo.ownerDescription")}
              </p>
              <div className="mt-5 space-y-2">
                {[t("demo.owner.f1"), t("demo.owner.f2"), t("demo.owner.f3")].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-zinc-500">
                    <div className="h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
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
              className="group rounded-[22px] border border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 to-zinc-900/50 p-6 transition-all hover:border-indigo-500/35"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3">
                  <KeyRound className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-zinc-600 transition-colors group-hover:text-indigo-400">
                  {t("demo.cardCta")} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <h3 className="mt-5 text-lg font-bold text-zinc-50">{t("demo.tenantTitle")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {t("demo.tenantDescription")}
              </p>
              <div className="mt-5 space-y-2">
                {[t("demo.tenant.f1"), t("demo.tenant.f2"), t("demo.tenant.f3")].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[13px] text-zinc-500">
                    <div className="h-1 w-1 shrink-0 rounded-full bg-indigo-600/50" />
                    {f}
                  </div>
                ))}
              </div>
            </TrackedLandingLink>
          </div>
        </section>

        {/* â”€â”€ Closing CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="mx-auto mt-28 max-w-lg px-4 text-center">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-zinc-50 sm:text-3xl">
            {t("closingCta.title")}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-500">
            {t("closingCta.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "closing_cta", perspective: "owner" }}
            >
              <Button
                size="lg"
                className="gap-2 bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-950 hover:bg-indigo-500"
              >
                <Play className="h-4 w-4" />
                {t("closingCta.primary")}
              </Button>
            </TrackedLandingLink>
            <TrackedLandingLink
              href="/auth/signin"
              eventName="landing.signin_click"
              eventData={{ location: "closing_cta" }}
            >
              <Button size="lg" variant="ghost" className="text-zinc-500 hover:text-zinc-200">
                {t("closingCta.secondary")}
              </Button>
            </TrackedLandingLink>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-white/[0.04] px-4 py-10">
        <div className="mx-auto max-w-6xl text-center text-sm text-zinc-600">
          <p>{tFooter("copyright", { year: new Date().getFullYear().toString() })}</p>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-700">
            <a href={`/${locale}/privacy`} className="transition-colors hover:text-zinc-400">
              {tFooter("privacy")}
            </a>
            <span>Â·</span>
            <a href={`/${locale}/terms`} className="transition-colors hover:text-zinc-400">
              {tFooter("terms")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
