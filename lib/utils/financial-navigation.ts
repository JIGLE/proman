export type FinancialReviewTarget = {
  propertyId?: string;
  tenantId?: string;
};

export function buildFinancialReviewPath(target?: FinancialReviewTarget): string {
  const params = new URLSearchParams({ tab: "receipts" });

  if (target?.propertyId) {
    params.set("propertyId", target.propertyId);
  }
  if (target?.tenantId) {
    params.set("tenantId", target.tenantId);
  }

  return `/financials?${params.toString()}`;
}

export function buildLocalizedFinancialReviewPath(
  locale: string,
  target?: FinancialReviewTarget,
): string {
  return `/${locale}${buildFinancialReviewPath(target)}`;
}
