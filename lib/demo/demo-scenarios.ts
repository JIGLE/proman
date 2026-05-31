/**
 * Demo Scenario Engine
 *
 * Automated scenario runner that simulates a realistic property management
 * workflow. Each step dispatches an action (add tenant, record payment, etc.)
 * with a delay between steps to give the user time to see what's happening.
 */

import { addDemoEntity, updateDemoEntity } from "./demo-local-state";

export interface ScenarioStep {
  /** Human-readable label shown during execution */
  label: string;
  /** Entity type being mutated */
  entity: string;
  /** Action to perform */
  action: "add" | "update";
  /** Data payload */
  data: Record<string, unknown>;
  /** Delay before this step in ms */
  delay: number;
}

/**
 * Pre-built scenario: New tenant move-in workflow
 */
export const MOVE_IN_SCENARIO: ScenarioStep[] = [
  {
    label: "Adding new tenant: Maria Santos",
    entity: "tenants",
    action: "add",
    delay: 800,
    data: {
      name: "Maria Santos",
      email: "maria.santos@example.com",
      phone: "+351 912 345 678",
      status: "active",
      moveInDate: new Date().toISOString().split("T")[0],
      propertyId: "demo-prop-1",
      propertyName: "Sunset Apartments",
      rentAmount: 950,
    },
  },
  {
    label: "Creating lease agreement",
    entity: "leases",
    action: "add",
    delay: 1200,
    data: {
      tenantId: "__LAST_TENANT_ID__",
      propertyId: "demo-prop-1",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      monthlyRent: 950,
      deposit: 1900,
      status: "active",
    },
  },
  {
    label: "Recording first month's rent payment",
    entity: "receipts",
    action: "add",
    delay: 1000,
    data: {
      tenantId: "__LAST_TENANT_ID__",
      propertyId: "demo-prop-1",
      amount: 950,
      type: "rent",
      status: "paid",
      date: new Date().toISOString().split("T")[0],
      description: "First month's rent - Maria Santos",
    },
  },
  {
    label: "Recording security deposit",
    entity: "receipts",
    action: "add",
    delay: 800,
    data: {
      tenantId: "__LAST_TENANT_ID__",
      propertyId: "demo-prop-1",
      amount: 1900,
      type: "deposit",
      status: "paid",
      date: new Date().toISOString().split("T")[0],
      description: "Security deposit - Maria Santos",
    },
  },
  {
    label: "Updating property status to occupied",
    entity: "properties",
    action: "update",
    delay: 600,
    data: {
      id: "demo-prop-1",
      status: "occupied",
    },
  },
];

/**
 * Pre-built scenario: Maintenance emergency workflow
 */
export const MAINTENANCE_SCENARIO: ScenarioStep[] = [
  {
    label: "Tenant reports plumbing emergency",
    entity: "maintenance",
    action: "add",
    delay: 800,
    data: {
      propertyId: "demo-prop-1",
      propertyName: "Sunset Apartments",
      tenantId: "demo-tenant-1",
      tenantName: "João Silva",
      title: "Kitchen pipe burst — water leaking",
      description: "Water leaking from kitchen pipe under the sink. Affecting floor below.",
      priority: "urgent",
      status: "open",
      category: "plumbing",
    },
  },
  {
    label: "Assigning to maintenance contractor",
    entity: "maintenance",
    action: "update",
    delay: 1200,
    data: {
      id: "__LAST_MAINTENANCE_ID__",
      status: "in_progress",
      assignedTo: "Carlos Plumbing Services",
      notes: "Contractor dispatched, ETA 2 hours",
    },
  },
  {
    label: "Logging repair expense",
    entity: "expenses",
    action: "add",
    delay: 1000,
    data: {
      propertyId: "demo-prop-1",
      amount: 280,
      category: "maintenance",
      description: "Emergency plumbing repair — kitchen pipe replacement",
      date: new Date().toISOString().split("T")[0],
      vendor: "Carlos Plumbing Services",
      status: "paid",
    },
  },
  {
    label: "Resolving maintenance ticket",
    entity: "maintenance",
    action: "update",
    delay: 800,
    data: {
      id: "__LAST_MAINTENANCE_ID__",
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolution: "Kitchen pipe replaced. Area dried and inspected. No structural damage.",
    },
  },
];

export interface ScenarioConfig {
  name: string;
  description: string;
  steps: ScenarioStep[];
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    name: "New Tenant Move-in",
    description: "Walk through adding a tenant, creating a lease, and recording payments",
    steps: MOVE_IN_SCENARIO,
  },
  {
    name: "Maintenance Emergency",
    description: "Handle an urgent maintenance request from report to resolution",
    steps: MAINTENANCE_SCENARIO,
  },
];

export interface ScenarioProgress {
  currentStep: number;
  totalSteps: number;
  label: string;
  isRunning: boolean;
  isComplete: boolean;
}

type ProgressCallback = (progress: ScenarioProgress) => void;

/**
 * Run a demo scenario, executing each step with delays.
 * Returns a function to cancel the scenario.
 */
export function runScenario(steps: ScenarioStep[], onProgress: ProgressCallback): () => void {
  let cancelled = false;
  let lastTenantId = "";
  let lastMaintenanceId = "";

  async function execute() {
    for (let i = 0; i < steps.length; i++) {
      if (cancelled) break;

      const step = { ...steps[i] };

      onProgress({
        currentStep: i,
        totalSteps: steps.length,
        label: step.label,
        isRunning: true,
        isComplete: false,
      });

      await new Promise((resolve) => setTimeout(resolve, step.delay));
      if (cancelled) break;

      // Resolve placeholder IDs
      const data = { ...step.data };
      for (const key of Object.keys(data)) {
        if (data[key] === "__LAST_TENANT_ID__" && lastTenantId) {
          data[key] = lastTenantId;
        }
        if (data[key] === "__LAST_MAINTENANCE_ID__" && lastMaintenanceId) {
          data[key] = lastMaintenanceId;
        }
      }

      if (step.action === "add") {
        const created = addDemoEntity(step.entity as Parameters<typeof addDemoEntity>[0], data);
        if (step.entity === "tenants") lastTenantId = created.id;
        if (step.entity === "maintenance") lastMaintenanceId = created.id;
      } else if (step.action === "update" && data.id) {
        updateDemoEntity(
          step.entity as Parameters<typeof updateDemoEntity>[0],
          data.id as string,
          data,
        );
      }
    }

    if (!cancelled) {
      onProgress({
        currentStep: steps.length,
        totalSteps: steps.length,
        label: "Scenario complete!",
        isRunning: false,
        isComplete: true,
      });
    }
  }

  execute();

  return () => {
    cancelled = true;
  };
}
