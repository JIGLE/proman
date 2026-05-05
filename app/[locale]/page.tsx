import { redirect } from "next/navigation";
import {
  AlarmClock,
  ArrowRight,
  BadgeEuro,
  Building2,
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

  const trustChips = [t("chips.simple"), t("chips.compliance"), t("chips.workflow")];

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

  const featureItems = [
    { key: "rentCollection", icon: AlarmClock },
    { key: "receipts", icon: ReceiptText },
    { key: "taxCompliance", icon: ShieldCheck },
    { key: "maintenance", icon: Wrench },
    { key: "leaseManagement", icon: ScrollText },
    { key: "tenantPortal", icon: Users },
  ] as const;

  const demoOptions = [
    {
      key: "owner",
      icon: ShieldCheck,
      title: t("demo.ownerTitle"),
      description: t("demo.ownerDescription"),
      href: `/${locale}/demo?perspective=owner`,
    },
    {
      key: "tenant",
      icon: KeyRound,
      title: t("demo.tenantTitle"),
      description: t("demo.tenantDescription"),
      href: `/${locale}/demo?perspective=tenant`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-50">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-500" />
            <span className="text-xl font-bold">Proman</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <TrackedLandingLink
              href="/auth/signin"
              eventName="landing.signin_click"
              eventData={{ location: "header" }}
            >
              <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-zinc-50">
                {t("cta")}
              </Button>
            </TrackedLandingLink>
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "header", perspective: "owner" }}
            >
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                {t("headerCta")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </TrackedLandingLink>
          </div>
        </div>
      </header>

      <main className="px-4 pb-16 pt-28">
        <LandingAnalyticsObserver locale={locale} demoEnabled={true} />

        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-200">
              {t("eyebrow")}
            </div>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                {t("hero")}
              </h1>
              <p className="max-w-xl text-lg text-zinc-300">{t("subtitle")}</p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <TrackedLandingLink
                href={`/${locale}/demo?perspective=owner`}
                eventName="landing.demo_start"
                eventData={{ location: "hero_primary", perspective: "owner" }}
              >
                <Button
                  size="xl"
                  className="h-12 gap-2 bg-blue-600 px-8 text-base text-white hover:bg-blue-700"
                >
                  <Play className="h-4 w-4" />
                  {t("demoCta")}
                </Button>
              </TrackedLandingLink>
              <TrackedLandingLink
                href="#how-it-works"
                eventName="landing.workflow_cta_click"
                eventData={{ location: "hero_secondary" }}
              >
                <Button
                  size="xl"
                  variant="outline"
                  className="h-12 gap-2 border-zinc-700 px-8 text-base text-zinc-200 hover:border-zinc-500 hover:text-zinc-50"
                >
                  {t("secondaryCta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TrackedLandingLink>
            </div>

            <p className="text-sm text-zinc-300">{t("microcopy")}</p>

            <div className="flex flex-wrap items-center gap-2">
              {trustChips.map((chip) => (
                <div
                  key={chip}
                  className="rounded-full border border-zinc-600 bg-zinc-800/80 px-3 py-1 text-xs font-medium text-zinc-100"
                >
                  {chip}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden rounded-[28px] border border-zinc-800 bg-zinc-900/70 p-4 shadow-2xl shadow-black/30 lg:block">
            <div className="overflow-hidden rounded-[22px] border border-zinc-800 bg-zinc-950">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    {t("preview.label")}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-100">{t("preview.title")}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{t("preview.subtitle")}</p>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  {t("preview.badge")}
                </div>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-xs font-semibold text-red-300">
                          1
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-100">
                            {t("preview.steps.detect.title")}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {t("preview.steps.detect.description")}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-red-300">EUR 950</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-300">
                          2
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-100">
                            {t("preview.steps.receipt.title")}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {t("preview.steps.receipt.description")}
                          </p>
                        </div>
                      </div>
                      <Building2 className="h-4 w-4 text-blue-300" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-300">
                          3
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-100">
                            {t("preview.steps.compliance.title")}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {t("preview.steps.compliance.description")}
                          </p>
                        </div>
                      </div>
                      <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-500/30 bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <BadgeEuro className="h-4 w-4 text-blue-300" />
                    {t("preview.result.title")}
                  </div>
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {t("preview.result.netLabel")}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-50">EUR 897</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>{t("preview.result.receipt")}</span>
                        <span className="font-medium text-zinc-100">
                          {t("preview.result.done")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>{t("preview.result.compliance")}</span>
                        <span className="font-medium text-zinc-100">PT / ES</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>{t("preview.result.export")}</span>
                        <span className="font-medium text-zinc-100">
                          {t("preview.result.ready")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto mt-20 max-w-6xl">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              {t("features.eyebrow")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-zinc-50 sm:text-3xl">
              {t("features.title")}
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureItems.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3"
              >
                <div className="rounded-lg bg-blue-500/10 p-2 w-fit">
                  <Icon className="h-5 w-5 text-blue-300" />
                </div>
                <p className="text-base font-semibold text-zinc-100">
                  {t(`features.items.${key}.title`)}
                </p>
                <p className="text-sm text-zinc-400">{t(`features.items.${key}.description`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="mx-auto mt-14 max-w-6xl rounded-[28px] border border-zinc-800 bg-zinc-900/55 p-6 sm:p-8"
        >
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              {t("howItWorks.eyebrow")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-zinc-50 sm:text-3xl">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-3 text-sm text-zinc-300 sm:text-base">{t("howItWorks.subtitle")}</p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {howItWorksSteps.map((step, index) => (
              <div key={step.key} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <step.icon className="h-5 w-5 text-blue-300" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-500">0{index + 1}</span>
                </div>
                <p className="mt-4 text-base font-semibold text-zinc-100">{step.title}</p>
                <p className="mt-2 text-sm text-zinc-400">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "how_it_works_cta", perspective: "owner" }}
            >
              <Button size="lg" className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                <Play className="h-4 w-4" />
                {t("demoCta")}
              </Button>
            </TrackedLandingLink>
          </div>
        </section>

        {/* Demo Cards */}
        <section className="mx-auto mt-6 max-w-6xl">
          <div className="mb-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("demo.label")}</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-50">{t("demo.title")}</h2>
            <p className="mt-1 text-sm text-zinc-400">{t("demo.subtitle")}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {demoOptions.map((option) => (
              <TrackedLandingLink
                key={option.key}
                href={option.href}
                eventName="landing.demo_start"
                eventData={{ location: "demo_card", perspective: option.key }}
                className="rounded-[24px] border border-zinc-800 bg-zinc-900/65 p-5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-blue-600/10 p-3">
                    <option.icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{option.title}</h3>
                      <Play className="h-4 w-4 text-zinc-500" />
                    </div>
                    <p className="text-sm text-zinc-400">{option.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-300">
                      {t("demo.cardCta")}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </TrackedLandingLink>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto mt-20 max-w-2xl px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-zinc-50 sm:text-3xl">{t("closingCta.title")}</h2>
          <p className="mt-4 text-base text-zinc-400">{t("closingCta.subtitle")}</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "closing_cta", perspective: "owner" }}
            >
              <Button size="lg" className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                <Play className="h-4 w-4" />
                {t("closingCta.primary")}
              </Button>
            </TrackedLandingLink>
            <TrackedLandingLink
              href="/auth/signin"
              eventName="landing.signin_click"
              eventData={{ location: "closing_cta" }}
            >
              <Button
                size="lg"
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-50"
              >
                {t("closingCta.secondary")}
              </Button>
            </TrackedLandingLink>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-zinc-800 px-4 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-zinc-500">
          <p>{tFooter("copyright", { year: new Date().getFullYear().toString() })}</p>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-600">
            <a href={`/${locale}/privacy`} className="hover:text-zinc-400 transition-colors">
              {tFooter("privacy")}
            </a>
            <span>·</span>
            <a href={`/${locale}/terms`} className="hover:text-zinc-400 transition-colors">
              {tFooter("terms")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
