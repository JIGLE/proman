/**
 * Next-intl navigation helpers.
 *
 * `localePrefix: "never"` matches how the app actually routes: `proxy.ts` rewrites an unprefixed
 * request to the resolved locale internally, so the address bar carries no language segment and
 * hrefs must not add one. Without this line these helpers default to `"always"` and would
 * reintroduce `/pt/…` the moment anything adopted them — which is worse than them being unused,
 * because it would look like the correct thing to reach for.
 *
 * Nothing imports them today: navigation is plain `next/link` with unprefixed paths, which needs
 * no abstraction now that the prefix is gone. They are kept, correctly configured, for the case
 * where locale-aware routing is wanted again.
 */

import { createNavigation } from "next-intl/navigation";
import { locales } from "./config";

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  localePrefix: "never",
});
