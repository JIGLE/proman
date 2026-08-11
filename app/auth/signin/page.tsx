import { AuthView } from "@/components/features/auth/auth-view";
import { isDemoLoginEnabled } from "@/lib/utils/demo-login";

export const dynamic = "force-dynamic";

export default function SignIn() {
  return <AuthView mode="signin" demoLoginEnabled={isDemoLoginEnabled()} />;
}
