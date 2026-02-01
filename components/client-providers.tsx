"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/lib/toast-context";
import { AppProvider } from "@/lib/app-context-db";
import { ThemeProvider } from "@/lib/theme-context";

export function ClientProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}