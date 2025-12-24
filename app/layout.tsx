import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "../components/client-providers";
import { ErrorBoundary } from "../components/error-boundary";

export const metadata: Metadata = {
  title: "Proman - Property Management Dashboard",
  description: "Modern property management dashboard with Linear/Vercel aesthetic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans">
        <ErrorBoundary>
          <ClientProviders>{children}</ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
