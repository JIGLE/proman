"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedLandingLink } from "./landing-analytics";

/**
 * Mobile-only bottom action bar that stays hidden on the first (hero) screen —
 * where the hero already shows the primary CTA — and slides up once the visitor
 * scrolls past it, so the CTA is always thumb-reachable without doubling up on
 * the first view. Native-app pattern; respects the safe-area inset.
 */
export function LandingStickyCta({ href, label }: { href: string; label: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-[#09090e]/90 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-md transition-transform duration-300 ease-out sm:hidden ${
        shown ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!shown}
    >
      <TrackedLandingLink
        href={href}
        eventName="landing.demo_start"
        eventData={{ location: "mobile_sticky", perspective: "owner" }}
        className="block"
      >
        <Button className="h-12 w-full gap-2 bg-teal-600 text-[15px] font-semibold text-white hover:bg-teal-500">
          <Play className="h-3.5 w-3.5" />
          {label}
        </Button>
      </TrackedLandingLink>
    </div>
  );
}
