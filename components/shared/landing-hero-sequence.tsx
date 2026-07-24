"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "framer-motion";
import { ArrowDown, ChevronDown } from "lucide-react";

import { SitusPortalMark } from "@/components/shared/situs-portal-logo";
import { TrackedLandingLink } from "@/components/shared/landing-analytics";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/contexts/theme-context";
import type { CountryCode } from "@/lib/design/country-themes";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/utils";

import styles from "./landing-hero-sequence.module.css";

/**
 * Desktop landing hero — scroll-scrubbed splash-to-settle sequence.
 *
 * At rest the mark sits centred on the whole hero at 1.3x scale with the rings already
 * spinning; scrolling the wheel travels it into its settled two-column position over the first
 * half of the gesture, then reveals the headline, subtitle and three actions over the second
 * half. Desktop only (lg:+) — mobile keeps the plain static hero below, and the installed-PWA
 * welcome screen (components/shared/pwa-welcome.tsx) already covers the equivalent mobile
 * moment. `--hero-p` is mirrored onto <html> so the site header (rendered in page.tsx, outside
 * this component) can fade in as the sequence settles instead of competing with the splash.
 */

const LOCALE_FLAGS: Record<Locale, string> = { pt: "🇵🇹", en: "🇬🇧", es: "🇪🇸", it: "🇮🇹" };

const COMING_SOON_LOCALES: { code: string; flag: string; label: string }[] = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
];

// A representative subset of lib/design/country-themes.ts's 28 entries — enough to demonstrate
// the picker without the popover growing unwieldy; any entry in that table can be added here.
const COUNTRY_SWATCH: { code: CountryCode; hex: string }[] = [
  { code: "PT", hex: "#006600" },
  { code: "ES", hex: "#aa151b" },
  { code: "DE", hex: "#000000" },
  { code: "FR", hex: "#0055a4" },
  { code: "IT", hex: "#009246" },
  { code: "SE", hex: "#006aa7" },
];

interface Props {
  locale: string;
}

export function LandingHeroSequence({ locale }: Props): React.ReactElement {
  const t = useTranslations("landing");
  const tLocaleCtrl = useTranslations("landing.localeControl");
  const tCountries = useTranslations("landing.countries");
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const { country, setCountry } = useTheme();

  const rootRef = useRef<HTMLDivElement>(null);
  const r1Ref = useRef<HTMLSpanElement>(null);
  const r2Ref = useRef<HTMLSpanElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef<HTMLButtonElement>(null);
  const ctaRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const root = rootRef.current;
    const orbitEl = orbitRef.current;
    const jumpEl = jumpRef.current;
    if (!root) return;

    if (!window.matchMedia("(min-width: 1024px)").matches) {
      // Mobile has no scroll sequence — the visual is hidden entirely (see JSX) — so the copy
      // must render settled, not stuck at the splash's --p: 0. The CSS module also forces this
      // below the lg breakpoint on its own (belt-and-suspenders against any pre-hydration gap);
      // this just keeps the two in sync explicitly.
      root.style.setProperty("--p", "1");
      return;
    }

    if (reducedMotion) {
      root.style.setProperty("--p", "1");
      document.documentElement.style.setProperty("--hero-p", "1");
      return;
    }

    let target = 0;
    let current = 0;
    let last: number | null = null;
    let angle1 = 0;
    let angle2 = 0;
    let boost = 1;
    let wasActive = true;
    let snapTimer: ReturnType<typeof setTimeout> | null = null;
    let rafId = 0;

    const BASE1 = 360 / 26; // deg/s at resting speed
    const BASE2 = -360 / 19; // deg/s at resting speed, reverse
    const MAX_BOOST = 3.2; // how much faster the rings spin while actively scrolling
    const BOOST_DECAY = 2.4; // per second — how fast that boost eases back to 1x once idle
    const EASE_RATE = 5.5; // time-based easing rate, frame-rate independent
    const SNAP_DELAY = 400; // ms idle before the magnet can act
    const SNAP_HIGH = 0.85; // only auto-complete forward once genuinely close to the end
    const SNAP_LOW = 0.15; // only auto-complete backward once genuinely close to the splash

    document.documentElement.dataset.heroSequenceActive = "true";

    function tick(now: number) {
      if (last === null) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Time-based exponential easing: smooth regardless of the display's refresh rate.
      const ease = 1 - Math.exp(-EASE_RATE * dt);
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.0004) current = target;
      root!.style.setProperty("--p", current.toFixed(4));
      document.documentElement.style.setProperty("--hero-p", current.toFixed(4));

      if (r1Ref.current && r2Ref.current) {
        boost += (1 - boost) * Math.min(1, BOOST_DECAY * dt);
        angle1 = (angle1 + BASE1 * boost * dt) % 360;
        angle2 = (angle2 + BASE2 * boost * dt) % 360;
        r1Ref.current.style.rotate = `${angle1.toFixed(2)}deg`;
        r2Ref.current.style.rotate = `${angle2.toFixed(2)}deg`;
      }

      const active = current < 0.999;
      if (active !== wasActive) {
        document.documentElement.dataset.heroSequenceActive = active ? "true" : "false";
        wasActive = active;
      }

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    function onWheel(e: WheelEvent) {
      // Once the page has scrolled past the hero, behave like a normal section.
      if (window.scrollY > 0) return;
      const atStart = target <= 0 && e.deltaY < 0;
      const atEnd = target >= 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      target = Math.max(0, Math.min(1, target + e.deltaY * 0.0015));
      boost = MAX_BOOST;

      // Scroll magnet: only engage close to either end, and only after a real pause — a slow,
      // deliberate scroll through the middle is never fought.
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        if (target > SNAP_HIGH) target = 1;
        else if (target < SNAP_LOW) target = 0;
      }, SNAP_DELAY);
    }
    root.addEventListener("wheel", onWheel, { passive: false });

    function onMouseMove(e: MouseEvent) {
      const rect = root!.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;
      root!.style.setProperty("--mx", `${(mx * 20).toFixed(1)}px`);
      root!.style.setProperty("--my", `${(my * 20).toFixed(1)}px`);
    }
    root.addEventListener("mousemove", onMouseMove);

    function onJump() {
      if (snapTimer) clearTimeout(snapTimer);
      target = 1;
    }
    jumpEl?.addEventListener("click", onJump);

    function bloom() {
      if (!orbitEl) return;
      orbitEl.classList.remove(styles.orbitBlooming);
      void orbitEl.offsetWidth; // force reflow so the animation can retrigger on repeat clicks
      orbitEl.classList.add(styles.orbitBlooming);
    }
    function onOrbitKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        bloom();
      }
    }
    function onOrbitAnimEnd(e: AnimationEvent) {
      if (e.animationName === "dilate") orbitEl?.classList.remove(styles.orbitBlooming);
    }
    orbitEl?.addEventListener("click", bloom);
    orbitEl?.addEventListener("keydown", onOrbitKeydown);
    orbitEl?.addEventListener("animationend", onOrbitAnimEnd);

    const ctaCleanups: Array<() => void> = [];
    for (const el of ctaRefs.current) {
      if (!el) continue;
      const pulse = () => {
        el.classList.remove(styles.isPulsing);
        void el.offsetWidth;
        el.classList.add(styles.isPulsing);
      };
      const onAnimEnd = (e: AnimationEvent) => {
        if (e.animationName === "ctaPulse") el.classList.remove(styles.isPulsing);
      };
      el.addEventListener("click", pulse);
      el.addEventListener("animationend", onAnimEnd);
      ctaCleanups.push(() => {
        el.removeEventListener("click", pulse);
        el.removeEventListener("animationend", onAnimEnd);
      });
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (snapTimer) clearTimeout(snapTimer);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("mousemove", onMouseMove);
      jumpEl?.removeEventListener("click", onJump);
      orbitEl?.removeEventListener("click", bloom);
      orbitEl?.removeEventListener("keydown", onOrbitKeydown);
      orbitEl?.removeEventListener("animationend", onOrbitAnimEnd);
      ctaCleanups.forEach((fn) => fn());
      document.documentElement.style.removeProperty("--hero-p");
      delete document.documentElement.dataset.heroSequenceActive;
    };
  }, [reducedMotion]);

  function switchLocale(newLocale: Locale) {
    if (newLocale === locale) return;
    document.cookie = `proman-locale=${newLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/") || `/${newLocale}`);
    setMenuOpen(false);
  }

  function selectCountry(code: CountryCode) {
    setCountry(code);
    setMenuOpen(false);
  }

  const filterQuery = filter.trim().toLowerCase();
  const filteredCountries = COUNTRY_SWATCH.filter(({ code }) => {
    if (!filterQuery) return true;
    return (
      code.toLowerCase().includes(filterQuery) ||
      tCountries(code.toLowerCase()).toLowerCase().includes(filterQuery)
    );
  });

  const currentFlag = LOCALE_FLAGS[locale as Locale] ?? LOCALE_FLAGS.en;

  return (
    <div
      ref={rootRef}
      className={cn(styles.root, "grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]")}
    >
      {/* Locale control — language + country theme, top-right, desktop only */}
      <div className={cn(styles.localeControl, "hidden lg:block")}>
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-canvas)] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]"
        >
          <span className="text-sm leading-none">{currentFlag}</span>
          {locale.toUpperCase()}
          <ChevronDown className="h-2.5 w-2.5 opacity-70" aria-hidden />
        </button>

        {menuOpen && (
          <div className={styles.localeMenu} onMouseLeave={() => setMenuOpen(false)}>
            <div className={styles.localeGroup}>
              <p className="mono-label mb-2">{tLocaleCtrl("language")}</p>
              <div className={styles.localeOptions}>
                {locales.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => switchLocale(l)}
                    className={cn(styles.localeOpt, l === locale && styles.localeOptActive)}
                  >
                    {LOCALE_FLAGS[l]}&nbsp; {localeNames[l]}
                  </button>
                ))}
                {COMING_SOON_LOCALES.map((entry) => (
                  <span
                    key={entry.code}
                    className={cn(styles.localeOpt, styles.localeOptSoon)}
                    aria-disabled
                  >
                    {entry.flag}&nbsp; {entry.label}
                    <span className={styles.soonTag}>{tLocaleCtrl("comingSoon")}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.localeGroup}>
              <p className="mono-label mb-2">{tLocaleCtrl("countryTheme")}</p>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={tLocaleCtrl("searchCountry")}
                className={styles.localeFilter}
              />
              <div className={styles.countryGrid}>
                {filteredCountries.map(({ code, hex }) => (
                  <button
                    key={code}
                    type="button"
                    title={tCountries(code.toLowerCase())}
                    style={{ background: hex }}
                    onClick={() => selectCountry(code)}
                    className={cn(styles.countryChip, country === code && styles.countryChipActive)}
                  >
                    {code}
                  </button>
                ))}
              </div>
              {filteredCountries.length === 0 && (
                <p className="mt-1.5 text-[11.5px] text-[var(--color-muted-foreground)]">
                  {tLocaleCtrl("noMatch")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hero copy */}
      <div>
        <p className={cn("mono-label mb-5", styles.copyEyebrow)}>{t("eyebrow")}</p>
        <h1
          className={cn(
            "max-w-2xl text-[clamp(44px,7vw,88px)] font-normal leading-[0.9] tracking-[-0.06em]",
            styles.copyH1,
          )}
        >
          {t("hero2")}
        </h1>
        <p
          className={cn(
            "mt-7 max-w-xl text-[clamp(16px,1.5vw,19px)] leading-relaxed text-[var(--color-muted-foreground)]",
            styles.copySubtitle,
          )}
        >
          {t("subtitle2")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div
            ref={(el) => {
              ctaRefs.current[0] = el;
            }}
            className={cn(styles.ctaWrap1, styles.ctaPulse, "w-full sm:w-auto")}
          >
            <TrackedLandingLink
              href={`/${locale}/demo?perspective=owner`}
              eventName="landing.demo_start"
              eventData={{ location: "hero_primary", perspective: "owner" }}
              className="w-full sm:w-auto"
            >
              <Button size="lg" className="w-full rounded-none font-semibold sm:w-auto">
                {t("heroCta.tryIt")}
              </Button>
            </TrackedLandingLink>
          </div>
          <div
            ref={(el) => {
              ctaRefs.current[1] = el;
            }}
            className={cn(styles.ctaWrap2, styles.ctaPulse, "w-full sm:w-auto")}
          >
            <TrackedLandingLink
              href="/auth/signup"
              eventName="landing.signup_start"
              eventData={{ location: "hero_secondary" }}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-none font-semibold sm:w-auto"
              >
                {t("heroCta.join")}
              </Button>
            </TrackedLandingLink>
          </div>
          <div
            ref={(el) => {
              ctaRefs.current[2] = el;
            }}
            className={cn(styles.ctaWrap3, styles.ctaPulse, "w-full sm:w-auto")}
          >
            <TrackedLandingLink
              href="/auth/signin"
              eventName="landing.signin_click"
              eventData={{ location: "hero" }}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-none font-semibold sm:w-auto"
              >
                {t("signIn")}
              </Button>
            </TrackedLandingLink>
          </div>
        </div>
      </div>

      {/* Hero visual — full-bleed overlay, centred at rest, travels into this column's space */}
      <div className="relative hidden min-h-[520px] lg:block">
        <div className={styles.heroVisual}>
          <div
            ref={orbitRef}
            role="button"
            tabIndex={0}
            aria-label={tLocaleCtrl("bloomAria")}
            className={styles.orbit}
          >
            <span className={styles.glow} aria-hidden />
            <span ref={r1Ref} className={cn(styles.ring, styles.ringR1)} aria-hidden />
            <span ref={r2Ref} className={cn(styles.ring, styles.ringR2)} aria-hidden />
            <span className={styles.markScale}>
              <SitusPortalMark size="sm" className="h-32 w-32" />
            </span>
          </div>
          <p className={cn("mono-label", styles.wordmark)}>Situs</p>
          <button
            ref={jumpRef}
            type="button"
            className={styles.scrollHint}
            aria-label={tLocaleCtrl("jumpAria")}
          >
            <ArrowDown aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
