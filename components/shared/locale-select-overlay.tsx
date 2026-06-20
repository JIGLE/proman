"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "proman.locale.selected";

const LOCALES = [
  {
    code: "pt",
    flag: "🇵🇹",
    name: "Português",
    greeting: "Bem-vindo",
  },
  {
    code: "en",
    flag: "🇬🇧",
    name: "English",
    greeting: "Welcome",
  },
  {
    code: "es",
    flag: "🇪🇸",
    name: "Español",
    greeting: "Bienvenido",
  },
] as const;

export function LocaleSelectOverlay({ currentLocale }: { currentLocale: string }) {
  const [visible, setVisible] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const already = localStorage.getItem(STORAGE_KEY);
    if (!already) {
      // Slight delay so the page beneath renders first
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, []);

  function handleSelect(code: string) {
    if (selecting) return;
    setSelecting(code);
    localStorage.setItem(STORAGE_KEY, code);
    // Keep the locale cookie in sync so root redirects respect the choice
    document.cookie = `proman-locale=${code}; Path=/; Max-Age=31536000; SameSite=Lax`;
    // Animate out, then navigate
    setTimeout(() => {
      setVisible(false);
      if (code !== currentLocale) {
        router.push(`/${code}`);
      }
    }, 220);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="locale-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-[var(--color-background)]/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -12, transition: { duration: 0.25 } }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-full max-w-md flex-col items-center gap-8 px-6"
          >
            {/* Logo / brand mark */}
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted-foreground)]">Domora</p>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">Choose your language</h1>
              <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
                Select a language to continue. You can change it later.
              </p>
            </div>

            {/* Language cards */}
            <div className="grid w-full grid-cols-3 gap-3">
              {LOCALES.map((locale, i) => (
                <motion.button
                  key={locale.code}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.35, ease: "easeOut" }}
                  onClick={() => handleSelect(locale.code)}
                  disabled={!!selecting}
                  className="group flex flex-col items-center gap-2.5 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-card)]/70 px-3 py-5 text-center transition-all duration-200 hover:border-blue-500/60 hover:bg-[var(--color-surface)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait"
                  style={{
                    ...(selecting === locale.code
                      ? { borderColor: "rgb(59 130 246 / 0.8)", background: "rgb(30 58 138 / 0.3)" }
                      : {}),
                  }}
                >
                  <span className="text-3xl leading-none">{locale.flag}</span>
                  <span className="text-xs font-semibold text-[var(--color-foreground)]">{locale.name}</span>
                  <span className="text-[10px] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-muted-foreground)]">
                    {locale.greeting}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
