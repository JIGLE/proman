"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Client half of the auth layout. Split out so `layout.tsx` can stay a server component and
 * resolve the locale + message bundle before rendering — `SessionProvider` is the only part
 * of that layout that genuinely needs to run on the client.
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
