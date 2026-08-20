/**
 * Who is allowed to sign in.
 *
 * THE HOLE THIS CLOSES. The OAuth `signIn` callback ended in an unconditional `return true`, and
 * the JWT callback provisioned every new OAuth identity with `role: "ADMIN"` hardcoded. On a
 * publicly reachable instance with Google configured — which a live bank connection requires,
 * because the provider has to reach the consent callback — anyone who found the URL and clicked
 * "Sign in with Google" received an administrator account. Their own data stayed scoped to them,
 * so nothing leaked in the other direction; the exposure is that a self-hosted instance silently
 * accumulated other people's names and email addresses, making its operator a data controller for
 * strangers.
 *
 * THE POLICY. First user wins, then closed:
 *
 *   - an email that already has a `User` row signs in as it always did;
 *   - if there are NO users at all, this is first-run bootstrap: allow it, and that account
 *     becomes the administrator;
 *   - anyone else is refused.
 *
 * `AUTH_ALLOWED_EMAILS` is the escape hatch for deliberately adding a second person, because
 * "closed forever after the first sign-in" with no way back is how someone ends up editing the
 * database by hand. It is additive and optional; absent, the rule above stands alone.
 *
 * WHY IT REFUSES RATHER THAN CREATING A LESSER ACCOUNT. A stranger with a working login on a
 * private rent ledger is a support question and a data-protection obligation even when they can
 * see nothing. Refusing costs the legitimate second user one config line; admitting them costs
 * the operator a GDPR relationship they never agreed to.
 */

import { getPrismaClient } from "@/lib/services/database/database";

export type SignInDecision =
  | { allow: true; reason: "existing_user" | "bootstrap" | "allowlisted" }
  | { allow: false; reason: "registration_closed" };

/** Emails permitted in addition to existing users. Absent or blank means "nobody extra". */
export function allowedEmails(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Decide whether `email` may sign in.
 *
 * Takes the counts it needs rather than reading them, so the policy is a pure function and the
 * cases below can be enumerated without a database. `resolveSignIn` does the reading.
 */
export function decideSignIn(input: {
  email: string;
  userExists: boolean;
  totalUsers: number;
  allowed: string[];
}): SignInDecision {
  if (input.userExists) return { allow: true, reason: "existing_user" };

  // Bootstrap. Checked before the allowlist so a first run needs no configuration at all.
  if (input.totalUsers === 0) return { allow: true, reason: "bootstrap" };

  if (input.allowed.includes(input.email.trim().toLowerCase())) {
    return { allow: true, reason: "allowlisted" };
  }

  return { allow: false, reason: "registration_closed" };
}

/**
 * The same decision, against the database.
 *
 * Fails CLOSED. A database that cannot be read must not open the door: an outage would otherwise
 * become an unauthenticated-signup window, which is the opposite of what this exists for. The
 * caller logs; the user sees the ordinary sign-in failure.
 */
export async function resolveSignIn(email: string): Promise<SignInDecision> {
  const prisma = getPrismaClient();
  const [existing, totalUsers] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.count(),
  ]);

  return decideSignIn({
    email,
    userExists: Boolean(existing),
    totalUsers,
    allowed: allowedEmails(),
  });
}
