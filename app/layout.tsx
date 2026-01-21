import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/client-providers";
import VersionBadge from '@/components/version-badge';
import { CurrencyProvider } from '@/lib/currency-context';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Proman - Property Management Dashboard",
  description: "Minimal property management dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CurrencyProvider>
          <ClientProviders>
            {children}
            <div style={{position: 'fixed', right: 12, bottom: 8}}>
              <VersionBadge />
            </div>
          </ClientProviders>
        </CurrencyProvider>
      </body>
    </html>
  );
}