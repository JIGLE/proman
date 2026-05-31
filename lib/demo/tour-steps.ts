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
    title: "12 properties. 3 real scenarios.",
    description:
      "Your demo portfolio spans Lisbon, Porto, and Barcelona — apartments, offices, and multi-unit buildings all pre-loaded with real tenant, lease, and payment data. Navigate between sections from here.",
    placement: "right",
  },
  {
    target: '[data-tour="dashboard-stats"]',
    title: "One lease is expiring in days.",
    description:
      "Marina View Condo's lease ends May 28 — that's under 30 days. The overdue rent column and open maintenance ticket make it the most urgent property in the portfolio. See how the dashboard surfaces this automatically.",
    placement: "bottom",
  },
  {
    target: '[data-tour="properties"]',
    title: "Spot the broken setup at a glance.",
    description:
      "Alfama Heritage Loft has no tenant, no lease, and no map coordinates — a deliberate 'broken' scenario. The amber indicators and missing-address flag show exactly what needs fixing before this property can go live.",
    placement: "bottom",
  },
  {
    target: '[data-tour="sidebar"]',
    title: "Buildings group multi-unit blocks.",
    description:
      "Sunset Apartments and Ribeira Flats are building complexes — each with multiple units managed under one roof. Open the Portfolio section and switch to the Buildings tab to see how units are grouped.",
    placement: "right",
  },
  {
    target: '[data-tour="demo-banner"]',
    title: "Reset, replay, or switch perspectives.",
    description:
      "Use the demo banner to reset all data to its original state, restart this tour at any time, or switch to the tenant view to see exactly what a renter experiences when they log in.",
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
    title: "Your workspace",
    description:
      "Navigate between properties, tenants, finances, and maintenance from the sidebar. Everything you need to run a portfolio is one click away.",
    placement: "right",
  },
  {
    target: '[data-tour="add-property"]',
    title: "Start by adding a property.",
    description:
      "Add your first property and fill in the address, type, and rent amount. Once it's there, you can attach a tenant, create a lease, and start recording payments.",
    placement: "bottom",
  },
  {
    target: '[data-tour="onboarding"]',
    title: "Four steps to a running portfolio.",
    description:
      "The setup checklist walks you through property → tenant → lease → first payment. Each step unlocks a new part of the dashboard. You can collapse it once you're done.",
    placement: "left",
  },
];
