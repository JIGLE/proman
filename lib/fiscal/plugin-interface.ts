/**
 * Country fiscal plugin interface.
 *
 * Each country that Domora supports must provide a plugin implementing
 * FiscalPlugin. Plugins read live rates from the TaxRule DB so that
 * legislative changes need only a DB update, not a code change.
 */

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export interface RentalTaxParams {
  /** Gross rental income for the period (€) */
  grossIncome: number;
  /** Documented allowable expenses for the period (€). Plugin caps to legal max. */
  expenses?: number;
  /** Regime key: "STANDARD", "NHR", "IFICI", "AL", "RENDA_ACESSIVEL", etc. */
  regime: string;
  /** Tax year */
  year: number;
}

export interface BracketBreakdown {
  min: number;
  max: number | null;
  rate: number;
  taxableInThisBracket: number;
  taxInThisBracket: number;
}

export interface TaxCalculation {
  grossIncome: number;
  allowableExpenses: number;
  taxableIncome: number;
  taxDue: number;
  /** taxDue / grossIncome */
  effectiveRate: number;
  /** Rate applied at source (e.g. tenant withholds 25% in PT) */
  withholdingRate: number;
  /** grossIncome * withholdingRate — already paid during the year */
  withholdingAlreadyPaid: number;
  /** taxDue - withholdingAlreadyPaid (positive = still owed, negative = refund) */
  balanceDue: number;
  bracketBreakdown: BracketBreakdown[];
  regime: string;
  year: number;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Plugin interface
// ---------------------------------------------------------------------------

export interface FiscalPlugin {
  /** ISO-3166-1 alpha-2 country code */
  readonly countryCode: string;
  /** Human-readable country name */
  readonly countryName: string;
  /** Label for the primary fiscal ID (e.g. "NIF", "NIE/NIF") */
  readonly fiscalIdLabel: string;
  /** List of regime keys this plugin understands */
  readonly supportedRegimes: readonly string[];

  /**
   * Calculate rental income tax for a given year/regime.
   * Reads live rates from the TaxRule DB.
   */
  calculateRentalTax(params: RentalTaxParams): Promise<TaxCalculation>;

  /**
   * Return the applicable withholding rate for a regime/year.
   * Returns 0 when no withholding applies.
   */
  getWithholdingRate(regime: string, year: number): Promise<number>;

  /**
   * Validate the local fiscal ID format (NIF, NIE, etc.).
   * Returns true if syntactically valid (does not check existence in registry).
   */
  validateFiscalId(id: string): boolean;
}
