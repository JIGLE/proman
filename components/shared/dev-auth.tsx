"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

// Dev-only session used for local UI testing and E2E in development
// Guarded by both NODE_ENV === 'development' and NEXT_PUBLIC_DEV_AUTH === 'true'
const DEV_SESSION = {
  expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1h
  user: { name: "Dev User", email: "dev@example.local", image: "/dev.png" },
};

export function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const enabled = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_AUTH === "true";

  // When enabled, provide a deterministic dev session. Otherwise, provide a normal SessionProvider.
  if (enabled) {
    return <SessionProvider session={DEV_SESSION as any}>{children}</SessionProvider>;
  }

  return <SessionProvider>{children}</SessionProvider>;
}
