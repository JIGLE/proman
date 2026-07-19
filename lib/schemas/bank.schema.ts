import { z } from "zod";

/** One normalized movement row — the shape lib/services/bank/csv.ts produces. */
export const bankRowSchema = z.object({
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "bookingDate must be YYYY-MM-DD"),
  valueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  amount: z
    .number()
    .finite()
    .refine((v) => v !== 0, "amount cannot be zero"),
  counterpartyName: z.string().max(200).optional(),
  counterpartyIban: z.string().max(50).optional(),
  reference: z.string().max(500).optional(),
});

/** POST /api/bank/import — raw CSV text or pre-parsed rows (manual entry). */
export const bankImportSchema = z
  .object({
    csv: z.string().max(1_000_000).optional(),
    rows: z.array(bankRowSchema).max(1000).optional(),
  })
  .refine((body) => !!body.csv || (body.rows && body.rows.length > 0), {
    message: "Provide csv text or rows",
  });

/** PUT /api/bank/transactions/[id] — inbox row actions. */
export const bankTransactionActionSchema = z
  .object({
    action: z.enum(["confirm", "reassign", "ignore"]),
    leaseId: z.string().optional(),
  })
  .refine((body) => body.action !== "reassign" || !!body.leaseId, {
    message: "reassign requires a leaseId",
  });

export type BankImportInput = z.infer<typeof bankImportSchema>;
export type BankTransactionActionInput = z.infer<typeof bankTransactionActionSchema>;
