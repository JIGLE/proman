"use client";

import { useRef, useCallback, type RefObject } from "react";

interface MagneticHoverOptions {
  maxOffset?: number;
  springStiffness?: number;
  springDamping?: number;
}

interface MagneticHoverResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  onMouseMove: (e: React.MouseEvent<T>) => void;
  onMouseLeave: () => void;
}

/**
 * Applies a "magnetic" cursor-follow effect: the element subtly shifts
 * toward the cursor while hovered, then springs back on leave.
 *
 * Only activates on devices that support hover (@media (hover: hover))
 * to avoid mobile layout jank.
 */
export function useMagneticHover<T extends HTMLElement = HTMLDivElement>(
  options: MagneticHoverOptions = {},
): MagneticHoverResult<T> {
  const { maxOffset = 8 } = options;
  const ref = useRef<T | null>(null);
  const rafId = useRef<number>(0);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<T>) => {
      const el = ref.current;
      if (!el) return;

      // Skip on touch devices
      if (!window.matchMedia("(hover: hover)").matches) return;

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const dx = ((e.clientX - cx) / (rect.width / 2)) * maxOffset;
        const dy = ((e.clientY - cy) / (rect.height / 2)) * maxOffset;

        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.transition = "transform 0.1s ease-out";
      });
    },
    [maxOffset],
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(rafId.current);
    el.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "translate(0, 0)";
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
