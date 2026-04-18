import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeEuro,
  Building2,
  CheckCircle2,
  FileText,
  KeyRound,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/shared/language-selector";
import { getTranslations } from "next-intl/server";

import pkg from "@/package.json";

const isDemoEnabled =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" || process.env.NODE_ENV !== "production";

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

  const valueBullets = [t("bullets.track"), t("bullets.receipts"), t("bullets.tax")];

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
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-500" />
            <span className="text-xl font-bold">Proman</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link href="/auth/signin">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:text-zinc-50 hover:border-zinc-600"
              >
                {t("cta")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 pt-28 pb-16">
        <section className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-200">
              {t("eyebrow")}
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                {t("hero")}
              </h1>
              <p className="max-w-2xl text-lg text-zinc-300">{t("subtitle")}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {valueBullets.map((bullet) => (
                <div
                  key={bullet}
                  className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-sm text-zinc-200">{bullet}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {isDemoEnabled && (
                <Link href={`/${locale}/demo?perspective=owner`}>
                  <Button
                    size="lg"
                    className="h-12 gap-2 bg-blue-600 px-8 text-base text-white hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4" />
                    {t("demoCta")}
                  </Button>
                </Link>
              )}
              <Link href="/auth/signin">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 gap-2 border-zinc-700 px-8 text-base text-zinc-200 hover:border-zinc-500 hover:text-zinc-50"
                >
                  {t("cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-zinc-400">{t("trustLine")}</p>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/70 p-4 shadow-2xl shadow-black/30">
            <div className="overflow-hidden rounded-[22px] border border-zinc-800 bg-zinc-950">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    {t("preview.label")}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-100">{t("preview.title")}</h2>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  {t("preview.badge")}
                </div>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-[1.18fr_0.82fr]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <BadgeEuro className="h-4 w-4 text-emerald-400" />
                        {t("preview.kpis.overdue")}
                      </div>
                      <p className="mt-3 text-2xl font-semibold text-zinc-50">EUR 2,000</p>
                      <p className="mt-1 text-xs text-zinc-500">{t("preview.kpis.overdueHint")}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Building2 className="h-4 w-4 text-blue-400" />
                        {t("preview.kpis.collected")}
                      </div>
                      <p className="mt-3 text-2xl font-semibold text-zinc-50">EUR 6,250</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("preview.kpis.collectedHint")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Users className="h-4 w-4 text-amber-400" />
                        {t("preview.kpis.occupancy")}
                      </div>
                      <p className="mt-3 text-2xl font-semibold text-zinc-50">92%</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {t("preview.kpis.occupancyHint")}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {t("preview.queue.title")}
                        </p>
                        <p className="text-xs text-zinc-500">{t("preview.queue.subtitle")}</p>
                      </div>
                      <div className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                        {t("preview.queue.badge")}
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-zinc-100">Maria Silva · Porto T1</p>
                            <p className="text-sm text-zinc-500">
                              {t("preview.queue.ownerAction")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-zinc-50">EUR 950</p>
                            <p className="text-xs text-red-300">{t("preview.queue.status")}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-zinc-100">Eixample Apartment</p>
                            <p className="text-sm text-zinc-500">{t("preview.queue.taxHint")}</p>
                          </div>
                          <div className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                            PT / ES
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="font-medium text-zinc-100">{t("preview.receipt.title")}</p>
                        <p className="text-xs text-zinc-500">{t("preview.receipt.subtitle")}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>{t("preview.receipt.country")}</span>
                        <span className="text-zinc-100">Portugal</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>{t("preview.receipt.gross")}</span>
                        <span className="text-zinc-100">EUR 950</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>{t("preview.receipt.tax")}</span>
                        <span className="text-zinc-100">- EUR 53</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-zinc-800 pt-3 font-semibold text-zinc-50">
                        <span>{t("preview.receipt.net")}</span>
                        <span>EUR 897</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Compliance snapshot</p>
                        <p className="text-xs text-zinc-500">
                          Portugal and Spain rent records in one workflow.
                        </p>
                      </div>
                      <div className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                        PT / ES
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Receipt output
                        </p>
                        <p className="mt-2 text-sm font-medium text-zinc-100">
                          Export-ready PDF with tax breakdown
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Collection view
                        </p>
                        <p className="mt-2 text-sm font-medium text-zinc-100">
                          Overdue, paid, and pending rent at a glance
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isDemoEnabled && (
          <section className="mx-auto mt-6 grid max-w-6xl gap-3 md:grid-cols-2">
            {demoOptions.map((option) => (
              <Link
                key={option.key}
                href={option.href}
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
              </Link>
            ))}
          </section>
        )}
      </main>

      <footer className="py-8 px-4 border-t border-zinc-800 mt-auto">
        <div className="max-w-6xl mx-auto text-center text-sm text-zinc-500">
          <p>{tFooter("copyright", { year: new Date().getFullYear().toString() })}</p>
          <p className="mt-1 text-zinc-600">v{pkg.version}</p>
        </div>
      </footer>
    </div>
  );
}
