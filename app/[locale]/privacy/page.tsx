import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/shared/language-selector";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale: _locale } = await params;
  const t = await getTranslations("footer");
  return {
    title: `${t("privacy")} — Domora`,
    description: "How Domora collects, uses, and protects your personal data.",
    robots: { index: false },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("footer");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href={`/${locale}`}
            className="text-sm font-semibold tracking-tight text-zinc-50 transition-opacity hover:opacity-80"
          >
            Domora
          </Link>
          <LanguageSelector />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <div className="mb-12">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-indigo-400">
            Legal
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            {t("privacy")}
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Last updated: January 2025 &mdash; Subject to legal review.
          </p>
        </div>

        <div className="space-y-10 text-[15px] leading-7">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-100">1. Introduction</h2>
            <p>
              Domora (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the platform&rdquo;) is committed
              to protecting your personal data in accordance with the General Data Protection
              Regulation (GDPR) and applicable national law. This policy explains what data we
              collect, how we use it, and your rights as a data subject.
            </p>
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
              [Placeholder — this page is pending full legal review. Do not rely on it as legal
              advice.]
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-100">2. Data We Collect</h2>
            <ul className="ml-4 list-disc space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-300">Account data:</strong> name, email address, hashed
                password.
              </li>
              <li>
                <strong className="text-zinc-300">Property and tenant data:</strong> addresses,
                lease terms, rent amounts, and related documents you upload.
              </li>
              <li>
                <strong className="text-zinc-300">Usage data:</strong> pages visited, feature
                interactions, browser/device type, and IP address (anonymised after 90 days).
              </li>
              <li>
                <strong className="text-zinc-300">Payment data:</strong> billing information is
                processed by Stripe; we do not store card numbers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-100">3. How We Use Your Data</h2>
            <ul className="ml-4 list-disc space-y-2 text-zinc-400">
              <li>To provide, maintain, and improve the Domora service.</li>
              <li>
                To generate tax-compliance documents (AT receipts, IRS / IRPF exports) on your
                behalf.
              </li>
              <li>
                To send transactional emails (rent reminders, lease expiry alerts) you have
                configured.
              </li>
              <li>To detect and prevent fraud or abuse.</li>
              <li>To comply with our legal obligations under Portuguese and Spanish law.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-100">4. Data Retention</h2>
            <p className="text-zinc-400">
              Account data is retained for the lifetime of your account plus 30 days after deletion.
              Financial records (receipts, lease documents) are retained for 10 years to comply with
              fiscal obligations under Portuguese and Spanish law. Usage logs are purged after 12
              months.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-100">5. Your Rights (GDPR)</h2>
            <p className="mb-3 text-zinc-400">Under the GDPR you have the right to:</p>
            <ul className="ml-4 list-disc space-y-2 text-zinc-400">
              <li>Access a copy of the personal data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>
                Request erasure (&ldquo;right to be forgotten&rdquo;), subject to retention
                requirements above.
              </li>
              <li>Object to or restrict certain processing.</li>
              <li>Data portability (receive your data in machine-readable format).</li>
              <li>Lodge a complaint with your national data protection authority.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-100">6. Cookies</h2>
            <p className="text-zinc-400">
              Domora uses strictly necessary session cookies for authentication and CSRF protection.
              No third-party advertising or tracking cookies are used.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-100">7. Third-Party Processors</h2>
            <ul className="ml-4 list-disc space-y-2 text-zinc-400">
              <li>
                <strong className="text-zinc-300">Stripe</strong> — payment processing (EU data
                centre).
              </li>
              <li>
                <strong className="text-zinc-300">SendGrid</strong> — transactional email delivery.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-100">8. Contact</h2>
            <p className="text-zinc-400">
              For data protection enquiries or to exercise your rights, contact us at{" "}
              <a
                href="mailto:privacy@proman.app"
                className="text-indigo-400 underline-offset-4 hover:underline"
              >
                privacy@proman.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-16 border-t border-white/[0.06] pt-8">
          <Button variant="ghost" asChild className="text-zinc-500 hover:text-zinc-300">
            <Link href={`/${locale}`}>&larr; Back to Domora</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
