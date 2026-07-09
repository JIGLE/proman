/**
 * Minimal ICU-subset message formatter for contexts outside the React tree
 * (cron jobs, service-layer code) where next-intl's `useTranslations`/
 * `getTranslations` hooks aren't available and don't need to be — we already
 * have the plain message JSON, just want `{var}` interpolation and the
 * `{count, plural, one {...} other {...}}` form used in `messages/*.json`.
 *
 * Not a general ICU implementation — only what this codebase's catalogs use.
 */

export type Messages = Record<string, unknown>;

/** Dotted-path lookup into a nested messages object, e.g. "notifications.email.footer". */
export function getMessage(messages: Messages, path: string): string {
  const parts = path.split(".");
  let cur: unknown = messages;
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

const PLURAL_RE = /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g;
const VAR_RE = /\{(\w+)\}/g;

/** Interpolates `{var}` and `{var, plural, one {...} other {...}}` placeholders. */
export function formatMessage(
  template: string,
  values: Record<string, string | number> = {},
): string {
  let result = template.replace(
    PLURAL_RE,
    (_match, key: string, onePart: string, otherPart: string) => {
      const n = Number(values[key]);
      const chosen = n === 1 ? onePart : otherPart;
      return chosen.replace(/#/g, String(n));
    },
  );
  result = result.replace(VAR_RE, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
  return result;
}

/** Looks up `path` in `messages` and interpolates it in one call. */
export function t(
  messages: Messages,
  path: string,
  values?: Record<string, string | number>,
): string {
  return formatMessage(getMessage(messages, path), values);
}
