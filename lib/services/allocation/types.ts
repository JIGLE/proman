/**
 * Situs allocation engine — shared types.
 *
 * The engine is pure (no Prisma, no IO): it takes a snapshot of a lease's
 * rent periods and one incoming payment, and returns a plan describing how
 * the money distributes across reference months. The service layer applies
 * the plan inside a database transaction.
 */

/** A reference month — the month the money is FOR, not when it arrived. */
export interface PeriodRef {
  year: number;
  /** 1–12 */
  month: number;
}

/** Snapshot of a rent period as the engine sees it. */
export interface PeriodSnapshot extends PeriodRef {
  /** Existing DB id; absent on engine-created future periods. */
  id?: string;
  /** Rent owed for this month (snapshot of the lease rent at generation). */
  dueAmount: number;
  /** Sum of non-reversed allocations already applied. */
  allocatedAmount: number;
}

export interface PaymentInput {
  /** Source record id (bank transaction / receipt) — echoed for traceability. */
  id: string;
  amount: number;
  /** Payment date (bank booking date). */
  bookingDate: Date;
}

export type AllocationEntryType = "rent" | "partial" | "overpayment_credit";

export interface AllocationEntry {
  period: PeriodRef & {
    id?: string;
    /** True when the engine had to create this future period. */
    created?: boolean;
  };
  amount: number;
  type: AllocationEntryType;
}

export type AllocationWarning =
  | { code: "non_positive_amount" }
  | { code: "no_period_context" }
  | { code: "horizon_exceeded"; unallocated: number };

export interface AllocationPlan {
  paymentId: string;
  entries: AllocationEntry[];
  warnings: AllocationWarning[];
}

export interface PlanAllocationInput {
  payment: PaymentInput;
  /** Known periods for the lease, any order; the engine sorts chronologically. */
  periods: PeriodSnapshot[];
  /**
   * How many future months beyond the last known period the engine may
   * create to absorb overpayment. Default 12.
   */
  horizonMonths?: number;
  /**
   * Due amount for engine-created future periods. Defaults to the last
   * known period's dueAmount.
   */
  futureDueAmount?: number;
}

/** Persisted-derived rent period status (recomputed on every allocation write). */
export type RentPeriodStatus =
  "upcoming" | "due" | "overdue" | "partially_paid" | "paid" | "paid_late";

export type TenantPaymentStatus = "paid" | "overdue" | "pending";
