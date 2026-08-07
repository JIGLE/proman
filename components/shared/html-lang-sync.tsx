"use client";

import { useEffect } from "react";

/**
 * Keep `<html lang>` in step with the URL locale.
 *
 * The `<html>` element is rendered by the root layout (`app/layout.tsx`), which sits outside
 * the `[locale]` segment and so has no locale to read — it hardcodes `defaultLocale`. That
 * left every page announcing Portuguese to screen readers and translation tooling, including
 * the English, Spanish and Italian ones. Sync it from the client instead, where the locale
 * segment is known.
 */
export function HtmlLangSync({ locale }: { locale: string }): null {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
