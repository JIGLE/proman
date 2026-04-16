"use client";

import { GuidedTour } from "@/components/shared/guided-tour";
import { useDemoMode } from "@/lib/contexts/demo-context";
import { DEMO_TOUR_STEPS, NEW_USER_TOUR_STEPS } from "@/lib/demo/tour-steps";
import { useCallback } from "react";

export function AppTour() {
  const { isDemoMode } = useDemoMode();

  const handleComplete = useCallback(() => {
    // Tour complete — no additional action needed beyond sessionStorage flag
  }, []);

  const steps = isDemoMode ? DEMO_TOUR_STEPS : NEW_USER_TOUR_STEPS;
  const storageKey = isDemoMode ? "proman_demo_tour_seen" : "proman_new_user_tour_seen";

  return <GuidedTour steps={steps} onComplete={handleComplete} storageKey={storageKey} />;
}
