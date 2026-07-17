/**
 * Situs Migration A backfill — populate the rent-period ledger from existing
 * data. Idempotent and safe to re-run:
 *
 *  1. Every lease gets its RentPeriod rows (start → min(end, now+12mo)).
 *  2. Every existing rent Receipt is allocated through the waterfall,
 *     oldest first (allocateReceipt skips receipts that already have live
 *     allocations, so re-runs are no-ops).
 *
 * Ambiguous receipts (tenant with several active leases and no lease link)
 * are intentionally left unallocated for human review rather than guessed.
 *
 * Run: npx tsx scripts/backfill-rent-periods.ts
 */

import { getPrismaClient } from "../lib/services/database/database";
import { allocateReceipt, generateRentPeriods } from "../lib/services/allocation/service";

async function main() {
  const prisma = getPrismaClient();

  const leases = await prisma.lease.findMany({ select: { id: true } });
  let periodsCreated = 0;
  for (const lease of leases) {
    periodsCreated += await generateRentPeriods(lease.id);
  }
  console.log(`Leases processed: ${leases.length}; periods created: ${periodsCreated}`);

  const receipts = await prisma.receipt.findMany({
    where: { type: "rent" },
    orderBy: { date: "asc" },
    select: { id: true },
  });
  let allocated = 0;
  let skipped = 0;
  for (const receipt of receipts) {
    const plan = await allocateReceipt(receipt.id);
    if (plan && plan.entries.length > 0) allocated += 1;
    else skipped += 1;
  }
  console.log(`Rent receipts: ${receipts.length}; allocated: ${allocated}; skipped: ${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
