/**
 * Shared Framer Motion variants and transition presets.
 * Import from here rather than defining inline so all motion stays cohesive.
 *
 * Usage:
 *   import { fadeIn, slideUp, spring } from "@/lib/motion-variants";
 *   <motion.div {...fadeIn} />
 *   <motion.div variants={staggerItem} transition={spring} />
 */

// ─── Transition presets ──────────────────────────────────────────────────────

export const spring = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;

export const springGentle = {
  type: "spring",
  stiffness: 200,
  damping: 25,
} as const;

export const ease = {
  duration: 0.2,
  ease: "easeOut",
} as const;

export const easeMedium = {
  duration: 0.3,
  ease: "easeOut",
} as const;

export const easeSlow = {
  duration: 0.4,
  ease: "easeOut",
} as const;

// ─── Motion variants (use as spread props on <motion.X>) ─────────────────────

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: ease,
} as const;

export const fadeInSlow = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: easeMedium,
} as const;

export const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: ease,
} as const;

export const slideDown = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: ease,
} as const;

export const slideRight = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: ease,
} as const;

export const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: spring,
} as const;

export const scaleInFast = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
  transition: spring,
} as const;

// ─── Stagger containers ──────────────────────────────────────────────────────

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
} as const;

export const staggerContainerFast = {
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
} as const;

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: ease,
} as const;

// ─── Celebration / milestone animations ─────────────────────────────────────

/** Bouncy scale pop — use on achievement / milestone moments */
export const celebratePop = {
  animate: {
    scale: [1, 1.15, 0.95, 1],
  },
  transition: {
    duration: 0.4,
    ease: [0.34, 1.56, 0.64, 1] as number[],
  },
} as const;

/** Subtle pulse ring — use on badges or notification dots */
export const pulseRing = {
  animate: {
    opacity: [0.3, 0.7, 0.3],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  },
} as const;

/** Float up/down — use on empty-state illustrations */
export const floatY = {
  animate: {
    y: [-4, 4, -4],
  },
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut",
  },
} as const;

// ─── prefers-reduced-motion guard ───────────────────────────────────────────

/**
 * Returns instant (no-animation) versions of all variants when the user
 * has requested reduced motion. Use at the component level:
 *
 *   const resolved = useReducedMotion() ? reducedVariants : normalVariants;
 */
export const reducedFadeIn = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
  transition: { duration: 0 },
} as const;

export const reducedSlideUp = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 1, y: 0 },
  transition: { duration: 0 },
} as const;
