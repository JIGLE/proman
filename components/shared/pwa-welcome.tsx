"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { TrackedLandingLink } from "@/components/shared/landing-analytics";
import { LanguageSelector } from "@/components/shared/language-selector";
import { SitusPortalMark } from "@/components/shared/situs-portal-logo";
import { Button } from "@/components/ui/button";

/**
 * App-native welcome screen for the installed PWA. Only ever renders for signed-out visitors
 * (mounted from the already signed-out-gated `app/[locale]/page.tsx`) opening the app in
 * standalone display mode — a normal browser tab always sees the full marketing page instead.
 *
 * Sequence: the Portal mark forms alone, centered — then the orbiting rings/glow enter around
 * it — then it all settles into the welcome state (mark ~22% smaller, headline and the three
 * actions rising in from the bottom). Plays once per mount; does not loop.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type Phase = "mark" | "rings" | "welcome";

/** How long the rings/glow moment lingers before settling into welcome. */
const RINGS_HOLD_MS = 1400;

const wordContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 1.15 } },
};
const letterIn = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};
const tagIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, delay: 1.6 } },
};
const fxIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
};
const markScale = {
  full: { scale: 1 },
  settled: { scale: 0.78, transition: { duration: 0.5, ease: EASE_OUT } },
};
const belowContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const riseIn = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export function PwaWelcome({ locale }: { locale: string }) {
  const [standalone, setStandalone] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(prefersReducedMotion ? "welcome" : "mark");
  const t = useTranslations("landing");

  useEffect(() => {
    const isStandaloneDisplay = window.matchMedia("(display-mode: standalone)").matches;
    const isIosStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(isStandaloneDisplay || isIosStandalone);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) setPhase("welcome");
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (phase !== "rings" || prefersReducedMotion) return;
    const timer = setTimeout(() => setPhase("welcome"), RINGS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase, prefersReducedMotion]);

  if (!standalone) return null;

  const showFx = phase === "rings" && !prefersReducedMotion;
  const settled = phase === "welcome";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[var(--color-canvas)] px-6"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {settled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex justify-end pt-5"
        >
          <LanguageSelector compact />
        </motion.div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative grid place-items-center" style={{ width: 210, height: 210 }}>
          <AnimatePresence>
            {showFx && (
              <motion.div
                className="absolute inset-0"
                variants={fxIn}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full blur-xl motion-safe:animate-[pulse-gentle_3.4s_ease-in-out_infinite]"
                  style={{
                    background:
                      "radial-gradient(circle, color-mix(in srgb, var(--logo-primary) 28%, transparent) 0%, transparent 72%)",
                  }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-dashed border-[color-mix(in_srgb,var(--logo-primary)_55%,var(--color-border))] opacity-70 motion-safe:animate-[spin_24s_linear_infinite]"
                />
                <span
                  aria-hidden
                  className="absolute inset-[27px] rounded-full border border-dashed border-[color-mix(in_srgb,var(--logo-secondary)_45%,var(--color-border))] opacity-70 motion-safe:animate-[spin_17s_linear_infinite_reverse]"
                />
                <span
                  aria-hidden
                  className="absolute inset-[52px] rounded-full border border-[var(--color-border)] opacity-55"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            animate={settled ? "settled" : "full"}
            variants={markScale}
            className="relative z-10"
          >
            <SitusPortalMark
              size="hero"
              animated={!prefersReducedMotion}
              onDrawComplete={() => setPhase((p) => (p === "mark" ? "rings" : p))}
            />
          </motion.div>
        </div>

        <motion.div
          variants={wordContainer}
          initial={prefersReducedMotion ? "visible" : "hidden"}
          animate="visible"
          className="mt-5 flex text-xl font-bold uppercase tracking-[0.34em]"
        >
          {"SITUS".split("").map((char, i) => (
            <motion.span key={i} variants={letterIn}>
              {char}
            </motion.span>
          ))}
        </motion.div>

        <motion.p
          variants={tagIn}
          initial={prefersReducedMotion ? "visible" : "hidden"}
          animate="visible"
          className="mono-label mt-2"
        >
          Sovereign Capital System
        </motion.p>

        {settled && (
          <motion.div
            variants={belowContainer}
            initial="hidden"
            animate="visible"
            className="mt-7 max-w-[27ch]"
          >
            <motion.div
              variants={riseIn}
              className="mx-auto mb-6 h-px w-8 bg-[var(--color-border)]"
            />
            <motion.h2
              variants={riseIn}
              className="text-[19px] font-normal leading-snug tracking-[-0.02em]"
            >
              {t("hero2")}
            </motion.h2>
          </motion.div>
        )}
      </div>

      {settled && (
        <motion.div
          variants={belowContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-2.5 pb-6"
        >
          <motion.div variants={riseIn}>
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "pwa_welcome_primary", perspective: "owner" }}
            >
              <Button size="lg" className="w-full rounded-none font-semibold">
                {t("primaryCta")}
              </Button>
            </TrackedLandingLink>
          </motion.div>
          <motion.div variants={riseIn}>
            <TrackedLandingLink
              href="/auth/signup"
              eventName="landing.signup_start"
              eventData={{ location: "pwa_welcome" }}
            >
              <Button size="lg" variant="outline" className="w-full rounded-none font-semibold">
                {t("createAccount")}
              </Button>
            </TrackedLandingLink>
          </motion.div>
          <motion.div variants={riseIn}>
            <TrackedLandingLink
              href="/auth/signin"
              eventName="landing.signin_start"
              eventData={{ location: "pwa_welcome" }}
            >
              <Button size="lg" variant="outline" className="w-full rounded-none font-semibold">
                {t("signIn")}
              </Button>
            </TrackedLandingLink>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
