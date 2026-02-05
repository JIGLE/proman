import type { Metadata } from "next";
import { Inter } from "next/font/google";
// Development-only server patch to help locate React.Children.only failures
import '@/lib/dev/patch-react-children-only';
import "./globals.css";
import { getNonce } from '@/lib/utils/csp-nonce';

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
        {/* Pass nonce to Next.js for inline scripts */}
        {nonce && (
          <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `window.__CSP_NONCE__ = "${nonce}";`,
            }}
          />
        )}
        {children}
      </body>
    </html>
  );
}
