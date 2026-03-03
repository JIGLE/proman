import type { Metadata } from "next";
import { Inter } from "next/font/google";
// Development-only server patch to help locate React.Children.only failures
import "@/lib/dev/patch-react-children-only";
import "./globals.css";
import { getNonce } from "@/lib/utils/csp-nonce";
import UpdateBannerClient from "@/components/shared/update-banner-client";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Proman - Property Management Dashboard",
  description: "Minimal property management dashboard",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // Get CSP nonce for inline scripts/styles
  const nonce = await getNonce();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={inter.className}>
        {/* CSP nonce available via meta tag for scripts that need it */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
        {/* Update banner (admin-only) */}
        <UpdateBannerClient />
        {children}
      </body>
    </html>
  );
}
