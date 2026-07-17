"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BillingInfo } from "./settings-types";

interface SettingsBillingProps {
  billing: BillingInfo | null;
  billingLoading: boolean;
}

export function SettingsBilling({ billing, billingLoading }: SettingsBillingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription & Billing
        </CardTitle>
        <CardDescription>Manage your plan, usage, and payment details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {billingLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : billing ? (
          <>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Current plan</p>
                <p className="text-lg font-semibold capitalize">{billing.plan}</p>
                {billing.plan !== "free" && billing.status !== "active" && (
                  <p className="mt-1 text-xs capitalize text-amber-500">
                    Status: {billing.status.replace("_", " ")}
                  </p>
                )}
                {billing.cancelAtPeriodEnd && billing.currentPeriodEnd && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Moves to Free on {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Properties</p>
                <p className="text-lg font-semibold">
                  {billing.propertyCount}
                  {billing.maxProperties !== null ? ` / ${billing.maxProperties}` : ""}
                </p>
              </div>
            </div>

            {billing.maxProperties !== null && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, (billing.propertyCount / billing.maxProperties) * 100)}%`,
                  }}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {billing.plan !== "pro" && billing.plan !== "business" && (
                <Button asChild>
                  <a href="/api/billing/checkout?plan=pro">Upgrade to Pro</a>
                </Button>
              )}
              {billing.plan !== "business" && (
                <Button asChild variant="outline">
                  <a href="/api/billing/checkout?plan=business">Upgrade to Business</a>
                </Button>
              )}
              {billing.plan !== "free" && (
                <Button asChild variant="ghost" className="gap-1.5">
                  <a href="/api/billing/portal">
                    Manage billing <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Failed to load billing information.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default SettingsBilling;
