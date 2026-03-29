"use client";

import React, { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

// Dev-only session used for local UI testing and E2E in development
// Guarded by both NODE_ENV === 'development' and NEXT_PUBLIC_DEV_AUTH === 'true'

function createDevSession(): Session {
  return {
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24h
    user: {
      id: "dev-user",
      name: "Dev User",
      email: "dev@example.local",
      image: "/dev.png",
      role: "ADMIN",
    },
  };
}

function getStoredDevSession(): Session | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = sessionStorage.getItem("__devAuthSession");
    if (!stored) return null;

    const session = JSON.parse(stored) as Session;
    // Check if session is expired
    if (new Date(session.expires) < new Date()) {
      sessionStorage.removeItem("__devAuthSession");
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function storeDevSession(session: Session): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem("__devAuthSession", JSON.stringify(session));
  } catch {
    // sessionStorage might be unavailable in some contexts
  }
}

function extendDevSessionExpiry(): Session {
  const session = getStoredDevSession() || createDevSession();
  session.expires = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  storeDevSession(session);
  return session;
}

export function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const enabled =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_AUTH === "true";

  const [session, setSession] = useState<Session | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (enabled) {
      // Try to restore session from sessionStorage
      const stored = getStoredDevSession();
      if (stored) {
        setSession(stored);
      } else {
        // Create new session and store it
        const newSession = createDevSession();
        storeDevSession(newSession);
        setSession(newSession);
      }
    }
  }, [enabled]);

  // Extend session expiry on page focus or visibility change
  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => {
      const extended = extendDevSessionExpiry();
      setSession(extended);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleFocus();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);

  // Ensure session is initialized before rendering
  if (enabled && !isClient) {
    return <SessionProvider>{children}</SessionProvider>;
  }

  // When enabled, provide the dev session (from storage or newly created)
  if (enabled && session) {
    return <SessionProvider session={session}>{children}</SessionProvider>;
  }

  return <SessionProvider>{children}</SessionProvider>;
}
