import type { TourStep } from "@/components/shared/guided-tour";

/**
 * Tour shown to demo users on first entry.
 *
 * Aligned with the three demo scenarios pre-loaded in demo-data.ts:
 *   S1 — Happy Path      → Sunset Apt. 2A  (fully configured)
 *   S2 — Needs Attention → Marina View Condo (lease exp. May 28, overdue rent, open ticket)
 *   S3 — Broken Setup    → Alfama Heritage Loft (no tenant, no lease, no map coords)
 */
export const DEMO_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: "Your portfolio, pre-loaded",
    description:
      "12 demo properties across Portugal and Spain are ready to explore — apartments, offices, and multi-unit buildings. Navigate to any section from here.",
    placement: "right",
  },
  {
    target: '[data-tour="properties"]',
    title: "Three scenarios to explore",
    description:
      "Look for the coloured left borders: Sunset Apt. 2A is your happy path, Marina View Condo needs urgent attention (lease expires May 28), and Alfama Heritage Loft shows a broken setup with no tenant or lease.",
    placement: "bottom",
  },
  {
    target: '[data-tour="dashboard-stats"]',
    title: "Alerts are real, not placeholders",
    description:
      "The 'Needs attention' zone shows 4 open tickets and 2 leases expiring within 30 days. Click any alert to jump directly to the affected properties.",
    placement: "bottom",
  },
  {
    target: '[data-tour="quick-actions"]',
    title: "Map view has live pins",
    description:
      "10 of 12 properties have verified coordinates and appear on the map. Two properties show the 'Fix address' call-to-action — click the amber pin to see it in action.",
    placement: "left",
  },
  {
    target: '[data-tour="demo-banner"]',
    title: "Demo controls",
    description:
      "Reset the data back to its original state at any time, restart this tour, or switch to the tenant perspective to see the renter's view. A session timer shows remaining time.",
    placement: "bottom",
  },
];

/**
 * Tour shown to new real users after first login.
 * Shorter and focused on getting started.
 */
export const NEW_USER_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: "Your Workspace",
    description:
      "Navigate between your properties, tenants, finances, and maintenance from the sidebar.",
    placement: "right",
  },
  {
    target: '[data-tour="add-property"]',
    title: "Start by Adding a Property",
    description:
      "Add your first property to get started. You can include details like address, type, and unit count.",
    placement: "bottom",
  },
  {
    target: '[data-tour="onboarding"]',
    title: "Getting Started Checklist",
    description:
      "Follow the onboarding checklist to set up your workspace step by step. It'll guide you through the essentials.",
    placement: "left",
  },
];
