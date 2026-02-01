"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/lib/contexts/toast-context";
import { AppProvider } from "@/lib/contexts/app-context";
import { ThemeProvider } from "@/lib/contexts/theme-context";

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
