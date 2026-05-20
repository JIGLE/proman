import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
// Development-only server patch to help locate React.Children.only failures
import "@/lib/dev/patch-react-children-only";
import "./globals.css";
import { getNonce } from "@/lib/utils/csp-nonce";
import UpdateBannerClient from "@/components/shared/update-banner-client";
import { DevAuthProvider } from "@/components/shared/dev-auth";
import { defaultLocale } from "@/lib/i18n/config";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Proman — Property Management",
  description:
    "Proman automates the monthly compliance cycle for landlords in Portugal and Spain — from payment follow-up to AT electronic receipts and IRS / IRPF tax exports.",
  openGraph: {
    title: "Proman — Property Management",
    description:
      "Proman automates the monthly compliance cycle for landlords in Portugal and Spain — from payment follow-up to AT electronic receipts and IRS / IRPF tax exports.",
    type: "website",
    locale: "en_US",
    siteName: "Proman",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proman — Property Management",
    description:
      "Proman automates the monthly compliance cycle for landlords in Portugal and Spain — from payment follow-up to AT electronic receipts and IRS / IRPF tax exports.",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // Get CSP nonce for inline scripts/styles
  const nonce = await getNonce();

  return (
    <html
      lang={defaultLocale}
      className={plusJakartaSans.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>{nonce && <meta name="csp-nonce" content={nonce} />}</head>
      <body className={`${plusJakartaSans.className} antialiased`}>
        <DevAuthProvider>
          {/* Update banner (admin-only) */}
          <UpdateBannerClient />
          {children}
        </DevAuthProvider>
      </body>
    </html>
  );
}
