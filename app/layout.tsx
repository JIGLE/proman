import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Syne } from "next/font/google";
// Development-only server patch to help locate React.Children.only failures
import "@/lib/dev/patch-react-children-only";
import "./globals.css";
import { getNonce } from "@/lib/utils/csp-nonce";
import UpdateBannerClient from "@/components/shared/update-banner-client";
import { PwaRegister } from "@/components/shared/pwa-register";
import { DevAuthProvider } from "@/components/shared/dev-auth";
import { defaultLocale } from "@/lib/i18n/config";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  weight: ["600", "700", "800"],
});

const BRAND_TAGLINE = "Domora — Property management for European landlords";
const BRAND_DESCRIPTION =
  "Domora brings your properties, leases, receipts, expenses and tax compliance into one calm, private workspace — with rent-receipt and registry automation built for Portugal and Spain, and more of Europe to come.";

export const metadata: Metadata = {
  title: {
    default: BRAND_TAGLINE,
    template: "%s · Domora",
  },
  applicationName: "Domora",
  description: BRAND_DESCRIPTION,
  openGraph: {
    title: BRAND_TAGLINE,
    description: BRAND_DESCRIPTION,
    type: "website",
    locale: "en_US",
    siteName: "Domora",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TAGLINE,
    description: BRAND_DESCRIPTION,
  },
  // Installable PWA / iOS home-screen support.
  appleWebApp: {
    capable: true,
    title: "Domora",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d9488" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
  ],
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
      className={`${plusJakartaSans.variable} ${syne.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>{nonce && <meta name="csp-nonce" content={nonce} />}</head>
      <body className={`${plusJakartaSans.className} antialiased`}>
        <DevAuthProvider>
          {/* Update banner (admin-only) */}
          <UpdateBannerClient />
          {children}
          <PwaRegister />
        </DevAuthProvider>
      </body>
    </html>
  );
}
