"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/lib/toast-context";
import { AppProvider } from "@/lib/app-context-db";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AppProvider>
          {children}
        </AppProvider>
      </ToastProvider>
    </SessionProvider>
  );
}