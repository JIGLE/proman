"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";

export default function Home(): React.ReactElement {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'en';

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      // Redirect authenticated users to the overview page
      router.push(`/${locale}/overview`);
    }
  }, [status, router, locale]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950" role="status" aria-live="polite">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" aria-hidden="true"></div>
        <p className="text-zinc-400">Loading...</p>
        <span className="sr-only">Authenticating and redirecting to dashboard</span>
      </div>
    </div>
  );
}
