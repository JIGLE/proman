import Link from "next/link";
import { ArrowLeft, Building2, Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function TenantPortalLandingPage(): Promise<React.ReactElement> {
  const t = await getTranslations("tenantPortal.landing");

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backHome")}
          </Link>
        </div>

        <div className="flex justify-center">
          <div className="rounded-full bg-[var(--color-info-muted)] p-4">
            <Building2 className="h-10 w-10 text-[var(--color-primary)]" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{t("title")}</h1>
          <p className="text-[var(--color-muted-foreground)]">{t("description")}</p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-left space-y-4">
          <p className="text-sm font-medium text-[var(--color-foreground)]">{t("howToAccess")}</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--color-muted-foreground)]">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
          </ol>
        </div>

        <div className="flex items-center gap-2 justify-center text-sm text-[var(--color-muted-foreground)]">
          <Mail className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <span>{t("contactManager")}</span>
        </div>
      </div>
    </div>
  );
}
