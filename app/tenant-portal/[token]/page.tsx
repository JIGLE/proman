"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Separator } from "@/ui/separator";
import {
  Home,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Loader2,
} from "lucide-react";

interface TenantPortalData {
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string;
    leaseStart: string;
    leaseEnd: string;
    rent: number;
    paymentStatus: string;
    property?: {
      id: string;
      name: string;
      address: string;
    };
  };
  invoices: Array<{
    id: string;
    number: string;
    amount: number;
    dueDate: string;
    status: string;
    paidDate?: string;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    date: string;
    method: string;
    status: string;
    invoiceNumber?: string;
  }>;
  maintenanceRequests: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    description?: string;
  }>;
}

interface TenantPortalPageProps {
  params: Promise<{ token: string }>;
}

export default function TenantPortalPage({ params }: TenantPortalPageProps) {
  const router = useRouter();
  const t = useTranslations("tenantPortal.main");
  const tErrors = useTranslations("tenantPortal.errors");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TenantPortalData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/tenant-portal/${token}`);
        if (!response.ok) {
          if (response.status === 401 || response.status === 404) {
            setError(tErrors("invalidLink"));
          } else {
            setError(tErrors("loadFailed"));
          }
          return;
        }
        const result = await response.json();
        setData(result.data);
      } catch {
        setError(tErrors("connectionFailed"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, tErrors]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "succeeded":
      case "resolved":
        return "bg-green-100 text-green-800";
      case "pending":
      case "processing":
      case "open":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
      case "failed":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePayInvoice = async (invoiceId: string, amount: number) => {
    if (!token || processingPayment) return;

    setProcessingPayment(invoiceId);
    try {
      const response = await fetch(`/api/tenant-portal/${token}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount,
          paymentMethodType: "card", // Default to card, can expand later
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Payment failed");
      }

      const result = await response.json();

      // Redirect to Stripe checkout or show payment details
      if (result.data?.clientSecret) {
        // In production, integrate Stripe Elements here
        alert(`Payment initiated. Reference: ${result.data.paymentIntentId}`);
      }

      // Refresh data
      const dataResponse = await fetch(`/api/tenant-portal/${token}`);
      if (dataResponse.ok) {
        const refreshedData = await dataResponse.json();
        setData(refreshedData.data);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setProcessingPayment(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {t("accessError")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/")}>
              {t("returnHome")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { tenant, invoices, recentPayments, maintenanceRequests } = data;
  const pendingInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");
  const upcomingPayment = pendingInvoices[0];
  const daysUntilDue = upcomingPayment
    ? Math.ceil((new Date(upcomingPayment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-semibold">
                  {tenant.property ? tenant.property.name : t("yourRentalHome")}
                </h1>
                <p className="text-sm text-gray-500">
                  {t("tenantPortalFor", { name: tenant.name })}
                </p>
              </div>
            </div>
            {tenant.property && (
              <Badge variant="outline" className="hidden sm:flex">
                {tenant.property.name}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Trust banner */}
      {tenant.property?.address && (
        <div className="bg-blue-50 border-b border-blue-100">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 text-sm text-blue-700">
            <Building2 className="h-4 w-4 shrink-0" />
            <span>{tenant.property.address}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {t("overview")}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t("payments")}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            {!upcomingPayment && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    {t("allCaughtUp")}
                  </CardTitle>
                  <CardDescription className="text-green-700">{t("noDuePayments")}</CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t("monthlyRent")}</CardDescription>
                  <CardTitle className="text-2xl">{formatCurrency(tenant.rent)}</CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t("paymentStatus")}</CardDescription>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={getStatusColor(tenant.paymentStatus)}>
                      {tenant.paymentStatus === "current" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t("current")}
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          {tenant.paymentStatus}
                        </>
                      )}
                    </Badge>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t("leaseEnds")}</CardDescription>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    {formatDate(tenant.leaseEnd)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Upcoming Payment Alert */}
            {upcomingPayment && (
              <Card
                className={
                  daysUntilDue && daysUntilDue < 0
                    ? "border-red-200 bg-red-50"
                    : daysUntilDue && daysUntilDue <= 5
                      ? "border-yellow-200 bg-yellow-50"
                      : ""
                }
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {daysUntilDue && daysUntilDue < 0 ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                    {daysUntilDue && daysUntilDue < 0
                      ? t("paymentOverdue", { days: Math.abs(daysUntilDue) })
                      : daysUntilDue === 0
                        ? t("paymentDueToday")
                        : t("paymentDueInDays", { days: daysUntilDue ?? 0 })}
                  </CardTitle>
                  <CardDescription>
                    Invoice {upcomingPayment.number} - {formatCurrency(upcomingPayment.amount)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handlePayInvoice(upcomingPayment.id, upcomingPayment.amount)}
                    disabled={processingPayment === upcomingPayment.id}
                  >
                    {processingPayment === upcomingPayment.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("processing")}
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t("payNow")}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Property Details */}
            {tenant.property && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("propertyDetails")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("property")}</span>
                      <span className="font-medium">{tenant.property.name}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("address")}</span>
                      <span className="font-medium">{tenant.property.address}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("leasePeriod")}</span>
                      <span className="font-medium">
                        {formatDate(tenant.leaseStart)} - {formatDate(tenant.leaseEnd)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Maintenance */}
            {maintenanceRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("maintenanceRequests")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {maintenanceRequests.slice(0, 3).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-sm text-gray-500">{formatDate(request.createdAt)}</p>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Payments Tab — history + invoices */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("paymentHistory")}</CardTitle>
                <CardDescription>{t("yourRecentPayments")}</CardDescription>
              </CardHeader>
              <CardContent>
                {recentPayments.length === 0 ? (
                  <p className="text-[var(--color-muted-foreground)] text-center py-8">
                    {t("noPaymentHistory")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-card)]"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-full ${
                              payment.status === "succeeded"
                                ? "bg-[var(--color-success-muted)]"
                                : "bg-[var(--color-secondary)]"
                            }`}
                          >
                            {payment.status === "succeeded" ? (
                              <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                            ) : (
                              <Clock className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--color-foreground)]">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-sm text-[var(--color-muted-foreground)]">
                              {formatDate(payment.date)} • {payment.method}
                              {payment.invoiceNumber && ` • ${payment.invoiceNumber}`}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("invoices")}
                </CardTitle>
                <CardDescription>{t("yourBillingHistory")}</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-[var(--color-muted-foreground)] text-center py-8">
                    {t("noInvoices")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-card)]"
                      >
                        <div>
                          <p className="font-medium text-[var(--color-foreground)]">
                            {invoice.number}
                          </p>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {t("due")}: {formatDate(invoice.dueDate)}
                            {invoice.paidDate &&
                              ` \u2022 ${t("paid")}: ${formatDate(invoice.paidDate)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-[var(--color-foreground)]">
                            {formatCurrency(invoice.amount)}
                          </span>
                          <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                          {invoice.status !== "paid" && (
                            <Button
                              size="sm"
                              onClick={() => handlePayInvoice(invoice.id, invoice.amount)}
                              disabled={processingPayment === invoice.id}
                            >
                              {processingPayment === invoice.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                t("pay")
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          {t("needHelp")}
        </div>
      </footer>
    </div>
  );
}
