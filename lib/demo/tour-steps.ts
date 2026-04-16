import type { TourStep } from "@/components/shared/guided-tour";

/**
 * Tour shown to demo users on first entry.
 * Targets CSS selectors that exist in the main app shell.
 */
export const DEMO_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: "Navigation",
    description:
      "Use the sidebar to switch between Properties, Tenants, Finances, Leases, and Maintenance. Each section is pre-loaded with realistic sample data.",
    placement: "right",
  },
  {
    target: '[data-tour="properties"]',
    title: "Property Portfolio",
    description:
      "View and manage your properties. Try adding a new property or editing an existing one — all changes persist within your demo session.",
    placement: "bottom",
  },
  {
    target: '[data-tour="dashboard-stats"]',
    title: "Dashboard Overview",
    description:
      "Key metrics at a glance: occupancy rates, revenue, pending maintenance, and upcoming lease renewals.",
    placement: "bottom",
  },
  {
    target: '[data-tour="quick-actions"]',
    title: "Quick Actions",
    description:
      "Record payments, add tenants, or create maintenance tickets right from the dashboard without navigating away.",
    placement: "left",
  },
  {
    target: '[data-tour="demo-banner"]',
    title: "Demo Controls",
    description:
      "Use the toolbar above to reset demo data, restart this tour, or exit the demo. A session timer shows remaining time.",
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
