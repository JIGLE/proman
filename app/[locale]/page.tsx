import Link from "next/link";
import { Building2, Users, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/shared/language-selector";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("landing");

  const features = [
    {
      icon: Building2,
      title: t("features.properties.title"),
      description: t("features.properties.description"),
    },
    {
      icon: Users,
      title: t("features.tenants.title"),
      description: t("features.tenants.description"),
    },
    {
      icon: Wallet,
      title: t("features.finance.title"),
      description: t("features.finance.description"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-500" />
            <span className="text-xl font-bold">Proman</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link href="/auth/signin">
              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:text-zinc-50 hover:border-zinc-600">
                {t("cta")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            {t("hero")}
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            {t("subtitle")}
          </p>
          <Link href="/auth/signin">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 h-12 text-base">
              {t("cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-zinc-800 mt-auto">
        <div className="max-w-6xl mx-auto text-center text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} Proman. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
