import { DomoraMark } from "@/components/shared/brand-logo";

/**
 * Brand loading screen. Calm, single focal moment: the Domora mark sits inside a
 * softly pulsing halo over the brand background, with the wordmark beneath and a
 * slim indeterminate progress rail. Motion is gated behind `motion-safe` so it
 * honors `prefers-reduced-motion`. i18n isn't available inside a loading
 * boundary, so the only word shown is the brand name.
 */
export default function Loading() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-background)] px-6"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center">
        {/* Soft brand halo behind the mark */}
        <span
          aria-hidden
          className="absolute h-24 w-24 rounded-full bg-[var(--color-primary)] opacity-20 blur-2xl motion-safe:animate-pulse"
        />
        <DomoraMark className="relative h-14 w-14" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="font-display text-xl font-bold tracking-tight text-[var(--color-foreground)]">
          Domora
        </span>
        {/* Slim indeterminate rail — reads as "official", not a busy spinner */}
        <span
          aria-hidden
          className="relative h-0.5 w-32 overflow-hidden rounded-full bg-[var(--color-border)]"
        >
          <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--color-primary)] motion-safe:animate-[loadingSlide_1.2s_ease-in-out_infinite]" />
        </span>
      </div>

      <span className="sr-only">Loading Domora…</span>
    </div>
  );
}
