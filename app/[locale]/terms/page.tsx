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
    title: `${t("terms")} — Domora`,
    description: "Terms and conditions governing the use of Domora.",
    robots: { index: false },
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("footer");

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-muted-foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-[var(--color-background)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href={`/${locale}`}
            className="text-sm font-semibold tracking-tight text-[var(--color-foreground)] transition-opacity hover:opacity-80"
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
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
            {t("terms")}
          </h1>
          <p className="mt-3 text-sm text-[var(--color-foreground)]0">
            Last updated: January 2025 &mdash; Subject to legal review.
          </p>
        </div>

        <div className="space-y-10 text-[15px] leading-7">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account or using the Domora platform you agree to be bound by these
              Terms of Service. If you do not agree, you must not use the platform.
            </p>
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
              [Placeholder — this page is pending full legal review. Do not rely on it as legal
              advice.]
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              2. Service Description
            </h2>
            <p className="text-[var(--color-muted-foreground)]">
              Domora is a property management platform designed to help landlords and property
              managers in Portugal and Spain manage properties, tenants, leases, receipts, and
              tax-compliance obligations. The platform is provided &ldquo;as is&rdquo; and we make
              no warranty that it meets all applicable legal requirements in every jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              3. User Accounts
            </h2>
            <ul className="ml-4 list-disc space-y-2 text-[var(--color-muted-foreground)]">
              <li>You must provide accurate and complete registration information.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials.</li>
              <li>You must notify us immediately of any unauthorised access to your account.</li>
              <li>Accounts are personal and may not be transferred without our written consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              4. Acceptable Use
            </h2>
            <p className="mb-3 text-[var(--color-muted-foreground)]">You must not use Domora to:</p>
            <ul className="ml-4 list-disc space-y-2 text-[var(--color-muted-foreground)]">
              <li>Violate any applicable law or regulation.</li>
              <li>Upload or store data to which you do not have legal rights.</li>
              <li>Attempt to reverse-engineer, disassemble, or exploit the platform.</li>
              <li>Send unsolicited communications via platform email features.</li>
              <li>Impersonate any person or entity.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              5. Payment Terms
            </h2>
            <ul className="ml-4 list-disc space-y-2 text-[var(--color-muted-foreground)]">
              <li>
                Paid plans are billed monthly in advance. Prices are displayed inclusive of
                applicable VAT.
              </li>
              <li>Subscriptions renew automatically unless cancelled before the renewal date.</li>
              <li>
                Refunds are issued at our discretion for unused full months, except where required
                by law.
              </li>
              <li>
                We reserve the right to change pricing with 30 days&apos; notice. Continued use
                after the effective date constitutes acceptance.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              6. Limitation of Liability
            </h2>
            <p className="text-[var(--color-muted-foreground)]">
              To the maximum extent permitted by law, Domora&apos;s aggregate liability for any
              claim arising from or related to the service is limited to the fees you paid in the
              three months preceding the claim. We are not liable for indirect, incidental, special,
              or consequential damages, including loss of data or lost profits.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              7. Intellectual Property
            </h2>
            <p className="text-[var(--color-muted-foreground)]">
              The Domora platform and its source code (excluding third-party dependencies) are
              released under the MIT licence. Your data remains yours; you grant us a limited
              licence to process it solely to provide the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              8. Termination
            </h2>
            <p className="text-[var(--color-muted-foreground)]">
              You may delete your account at any time from account settings. We may suspend or
              terminate accounts that violate these terms with or without notice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              9. Governing Law
            </h2>
            <p className="text-[var(--color-muted-foreground)]">
              These terms are governed by the laws of Portugal. Any disputes shall be subject to the
              exclusive jurisdiction of the courts of Lisbon, unless mandatory consumer protection
              law in your country of residence provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">
              10. Contact
            </h2>
            <p className="text-[var(--color-muted-foreground)]">
              For any questions about these terms, contact us at{" "}
              <a
                href="mailto:legal@proman.app"
                className="text-indigo-400 underline-offset-4 hover:underline"
              >
                legal@proman.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-16 border-t border-white/[0.06] pt-8">
          <Button
            variant="ghost"
            asChild
            className="text-[var(--color-foreground)]0 hover:text-[var(--color-muted-foreground)]"
          >
            <Link href={`/${locale}`}>&larr; Back to Domora</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
