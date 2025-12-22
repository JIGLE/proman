import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
