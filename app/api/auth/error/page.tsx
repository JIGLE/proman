"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [showDetails, setShowDetails] = useState(false);
  const [debugInfo, setDebugInfo] = useState<unknown | null>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  const showDebug = debugInfo != null;

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "Access denied. You do not have permission to sign in.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      default:
        return "An unexpected error occurred during authentication.";
    }
  };

  const fetchDebugInfo = async () => {
    setLoadingDebug(true);
    setDebugError(null);
    try {
      const res = await fetch('/api/debug/db');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDebugInfo(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setDebugError(message || 'Failed to fetch debug info');
    } finally {
      setLoadingDebug(false);
    }
  };

  const copyDebug = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
      alert('Debug info copied to clipboard');
    } catch (err) {
      console.error(err);
      alert('Unable to copy');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="text-center max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Authentication Error</h1>
        <p className="text-zinc-300 mb-4">{getErrorMessage(error)}</p>

        <div className="text-sm text-zinc-400 mb-4 space-y-2 text-left">
          <p><strong>Quick checks:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ensure <code>NEXTAUTH_URL</code> is set to <code>https://proman.mj25.eu</code>.</li>
            <li>Confirm Google OAuth client has redirect URI <code>https://proman.mj25.eu/api/auth/callback/google</code>.</li>
            <li>Verify <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and <code>NEXTAUTH_SECRET</code> are defined in the TrueNAS SCALE app environment.</li>
            <li>Check database health: <code>/api/debug/db</code> (shows DB exists/writable and user count).</li>
          </ul>
        </div>

        <div className="space-y-3 mb-4">
          <Button asChild className="w-full">
            <Link href="/">Try Again</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/api/auth/signin">Sign In</Link>
          </Button>
        </div>

        <div className="mt-4 text-left">
          <Button variant="ghost" onClick={() => { setShowDetails(s => !s); if (!showDetails && !debugInfo) fetchDebugInfo(); }} className="mb-2">
            {showDetails ? 'Hide diagnostics' : 'Show diagnostics'}
          </Button>

          {showDetails && (
            <div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-sm text-zinc-200">
              <p className="mb-2">Error type: <strong>{error || 'Unknown'}</strong></p>
              <p className="mb-2">Helpful links:
                <br />- <a className="text-sky-400" href="https://console.cloud.google.com/apis/credentials">Google Cloud Console (Credentials)</a>
                <br />- <a className="text-sky-400" href="https://next-auth.js.org/getting-started/introduction">NextAuth docs</a>
              </p>

              <div className="mt-3">
                <p className="font-medium">DB debug</p>
                {loadingDebug && <p className="text-zinc-400">Loading…</p>}
                {debugError && <p className="text-rose-400">{debugError}</p>}
                {showDebug && (
                  <>
                    <pre className="max-h-48 overflow-auto text-xs bg-zinc-950 p-2 border border-zinc-800 rounded mt-2">{JSON.stringify(debugInfo as any, null, 2)}</pre>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={copyDebug}>Copy</Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/api/debug/db">Open raw</Link>
                      </Button>
                    </div>
                  </>
                )}

                {!loadingDebug && !debugInfo && !debugError && (
                  <p className="text-zinc-400 text-xs mt-2">No debug information fetched yet.</p>
                )}
              </div>

              <div className="mt-3 text-xs text-zinc-400">
                <p>If you need to temporarily allow sign-ins while diagnosing DB issues, set <code>NEXTAUTH_ALLOW_DB_FAILURE=true</code> and restart the app (development only).</p>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}