import { AuthView } from "@/components/features/auth/auth-view";

export const dynamic = "force-dynamic";

export default function SignUp() {
  return <AuthView mode="signup" />;
}
