import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
// Development-only server patch to help locate React.Children.only failures
import "@/lib/dev/patch-react-children-only";
import "./globals.css";
import { getNonce } from "@/lib/utils/csp-nonce";
import UpdateBannerClient from "@/components/shared/update-banner-client";
import { PwaRegister } from "@/components/shared/pwa-register";
import { DevAuthProvider } from "@/components/shared/dev-auth";
import { defaultLocale } from "@/lib/i18n/config";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

const BRAND_TAGLINE = "Situs — Sovereign Capital System";
const BRAND_DESCRIPTION =
  "Situs puts property income, receipts and tax evidence under control — bank movement matching, reference-month allocation, receipt automation and document intelligence for EU property portfolios.";

export const metadata: Metadata = {
  title: {
    default: BRAND_TAGLINE,
    template: "%s · Situs",
  },
  applicationName: "Situs",
  description: BRAND_DESCRIPTION,
  openGraph: {
    title: BRAND_TAGLINE,
    description: BRAND_DESCRIPTION,
    type: "website",
    locale: "en_US",
    siteName: "Situs",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TAGLINE,
    description: BRAND_DESCRIPTION,
  },
  // Installable PWA / iOS home-screen support.
  appleWebApp: {
    capable: true,
    title: "Situs",
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
  // Let content extend under the notch / home indicator so the mobile top bar
  // and bottom nav can pad themselves with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f0e4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b110d" },
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
      className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}
      data-country="PT"
      data-mode="normal"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>{nonce && <meta name="csp-nonce" content={nonce} />}</head>
      <body className={`${instrumentSans.className} antialiased`}>
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
