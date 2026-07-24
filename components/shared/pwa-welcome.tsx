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
 * Sequence: the Portal mark forms alone, centered in the whole screen — then the orbiting
 * rings/glow enter around it — then it all settles into the welcome state: the mark shrinks
 * (~28%) *inside* the rings, which hold their size and stay up as part of the settled
 * composition, while the headline and three actions rise in from the bottom. The mark's upward
 * travel is a framer-motion `layout` animation driven purely by the content growing beneath it
 * in this always-centered column. Plays once per mount; does not loop.
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
  // 0.72, not 0.78: now that the rings stay up through the settled state, the mark has to share
  // the frame with them rather than owning it. At 0.78 its own dashed keyline sat ~10px from the
  // inner ring, which read as crowded; this opens that clearance up so the orbit reads as space
  // around the mark instead of a band pressed against it.
  settled: { scale: 0.72, transition: { duration: 0.5, ease: EASE_OUT } },
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

  // The rings stay up through the settled state rather than fading out with the entrance — they
  // are part of the welcome composition, not just a flourish, and the mark alone read as bare and
  // undersized against the copy below it. Their rotation is `motion-safe:` gated in the class
  // lists, so a reduced-motion visitor gets the same static composition instead of no rings at all.
  const showFx = phase !== "mark";
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

      {/* Stays centred in both states. The mark still travels upward on settle — the divider,
          headline and CTA section mounting below it grow this column's content, so centring it
          pushes the mark up on its own — and `layout` on the moving children animates that
          smoothly. Previously this flipped to `justify-start pt-4` when settled, which pinned the
          group to the top and left a large dead band between the headline and the CTAs; letting
          it stay centred distributes that space above and below the composition instead. */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          layout
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="relative grid place-items-center"
          // 236, not 210: at 210 the mark's own dashed keyline (~173px at full scale) was wider
          // than the inner ring, so during the entrance phase the two collided and the orbit read
          // as a band cutting through the mark rather than space around it. 236 clears the mark in
          // both phases while still leaving the column short enough to fit a 844px screen.
          style={{ width: 236, height: 236 }}
        >
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
                {/* Keyline halo on the border, same trick the mark's own strokes use: some
                    countries' primary colour sits close to the canvas (e.g. Germany's black in
                    dark mode), so the flag colour alone isn't a reliable contrast guarantee. */}
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-dashed border-[color-mix(in_srgb,var(--logo-primary)_55%,var(--color-border))] opacity-70 shadow-[0_0_0_1px_var(--logo-keyline)] motion-safe:animate-[spin_24s_linear_infinite]"
                >
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-0 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      background: "var(--logo-primary)",
                      boxShadow:
                        "0 0 0 1px var(--logo-keyline), 0 0 9px 2px color-mix(in srgb, var(--logo-primary) 75%, transparent), 0 0 2px 1px var(--logo-primary)",
                    }}
                  />
                </span>
                <span
                  aria-hidden
                  className="absolute inset-[22px] rounded-full border border-dashed border-[color-mix(in_srgb,var(--logo-secondary)_45%,var(--color-border))] opacity-70 shadow-[0_0_0_1px_var(--logo-keyline)] motion-safe:animate-[spin_17s_linear_infinite_reverse]"
                >
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-1/2 h-[6px] w-[6px] -translate-x-1/2 translate-y-1/2 rounded-full"
                    style={{
                      background: "var(--logo-secondary)",
                      boxShadow:
                        "0 0 0 1px var(--logo-keyline), 0 0 9px 2px color-mix(in srgb, var(--logo-secondary) 75%, transparent), 0 0 2px 1px var(--logo-secondary)",
                    }}
                  />
                </span>
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
        </motion.div>

        <motion.div
          layout
          transition={{ duration: 0.5, ease: EASE_OUT }}
          variants={wordContainer}
          initial={prefersReducedMotion ? "visible" : "hidden"}
          animate="visible"
          className="mt-8 flex text-xl font-bold uppercase tracking-[0.34em]"
        >
          {"SITUS".split("").map((char, i) => (
            <motion.span key={i} variants={letterIn}>
              {char}
            </motion.span>
          ))}
        </motion.div>

        <motion.p
          layout
          transition={{ duration: 0.5, ease: EASE_OUT }}
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
          <motion.div variants={riseIn} whileTap={{ scale: 0.97 }}>
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "pwa_welcome_primary", perspective: "owner" }}
            >
              <Button size="lg" className="w-full rounded-none font-semibold">
                {t("heroCta.tryIt")}
              </Button>
            </TrackedLandingLink>
          </motion.div>
          <motion.div variants={riseIn} whileTap={{ scale: 0.97 }}>
            <TrackedLandingLink
              href="/auth/signup"
              eventName="landing.signup_start"
              eventData={{ location: "pwa_welcome" }}
            >
              <Button size="lg" variant="outline" className="w-full rounded-none font-semibold">
                {t("heroCta.join")}
              </Button>
            </TrackedLandingLink>
          </motion.div>
          <motion.div variants={riseIn} whileTap={{ scale: 0.97 }}>
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
