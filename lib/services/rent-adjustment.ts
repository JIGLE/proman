/**
 * Rent Adjustment Service — Phase 4E
 *
 * Calculates the maximum allowed rent increase per country rules (Portugal & Spain)
 * and generates legal notice metadata (notice periods, deadlines).
 *
 * Portugal: INE coefficient caps (NRAU)
 * Spain: Ley de Vivienda rent caps + zona tensionada rules
 */

import { type CountryCode } from "@/lib/utils/country";

// ─── Regulatory caps by year ──────────────────────────────────────────────

/** Portugal: INE coefficient cap (percentage as decimal) */
const PT_MAX_INCREASE: Record<number, number> = {
  2025: 0.0694, // 6.94%
  2026: 0.0216, // 2.16%
};

/** Spain: Ley de Vivienda rent-update cap (percentage as decimal) */
const ES_MAX_INCREASE: Record<number, number> = {
  2024: 0.03, // 3%
  2025: 0.02, // 2% — Ley de Vivienda
  2026: 0.02, // 2%
};

// ─── Notice periods (calendar days) ──────────────────────────────────────

const NOTICE_PERIOD_DAYS: Record<CountryCode, number> = {
  PT: 120, // NRAU Art. 32
  ES: 30, // LAU Art. 18
};

// ─── Interfaces ───────────────────────────────────────────────────────────

export interface RentAdjustmentInput {
  country: CountryCode;
  currentMonthlyRent: number;
  proposedMonthlyRent: number;
  leaseStartDate: string;
  isZonaTensionada?: boolean; // Spain only
  isGranTenedor?: boolean; // Spain only
  year?: number;
}

export interface RentAdjustmentResult {
  allowed: boolean;
  maxAllowedRent: number;
  maxIncreasePct: number;
  actualIncreasePct: number;
  noticePeriodDays: number;
  noticeDeadline: string; // ISO date — when notice must be sent before increase takes effect
  reason: string;
  country: CountryCode;
}

// ─── Service ──────────────────────────────────────────────────────────────

export class RentAdjustmentService {
  /**
   * Calculate max allowed rent increase.
   * PT: INE coefficient, capped at 6.94% for 2025, 2.16% for 2026
   * ES: INE reference index, 2% from 2025 (Ley de Vivienda)
   */
  static calculateAdjustment(input: RentAdjustmentInput): RentAdjustmentResult {
    const { country, currentMonthlyRent, proposedMonthlyRent, leaseStartDate } = input;
    const year = input.year ?? new Date().getFullYear();

    const actualIncreasePct =
      currentMonthlyRent > 0
        ? ((proposedMonthlyRent - currentMonthlyRent) / currentMonthlyRent) * 100
        : 0;

    let maxIncreasePct: number;
    let reason: string;

    if (country === "PT") {
      const cap = PT_MAX_INCREASE[year] ?? PT_MAX_INCREASE[2026];
      maxIncreasePct = cap * 100;
      reason = `Portugal: INE coefficient cap of ${maxIncreasePct.toFixed(2)}% for ${year} (NRAU).`;
    } else {
      // Spain
      const baseCap = ES_MAX_INCREASE[year] ?? ES_MAX_INCREASE[2026];
      let cap = baseCap;

      if (input.isZonaTensionada && input.isGranTenedor) {
        // Gran tenedor in zona tensionada: capped at lower of base cap or MITMA index.
        // Without a specific MITMA index value we enforce the regulatory cap.
        cap = Math.min(baseCap, baseCap);
        reason =
          `Spain: Gran tenedor in zona tensionada — capped at ${(cap * 100).toFixed(0)}% ` +
          `(Ley de Vivienda Art. 17.6, ${year}).`;
      } else if (input.isZonaTensionada) {
        reason =
          `Spain: Zona tensionada — max increase ${(cap * 100).toFixed(0)}% ` +
          `(Ley de Vivienda, ${year}).`;
      } else {
        reason =
          `Spain: Max rent increase ${(cap * 100).toFixed(0)}% ` +
          `(Ley de Vivienda INE reference index, ${year}).`;
      }

      maxIncreasePct = cap * 100;
    }

    const maxAllowedRent = currentMonthlyRent * (1 + maxIncreasePct / 100);
    const allowed = proposedMonthlyRent <= maxAllowedRent;

    // Calculate notice deadline based on lease anniversary
    const leaseDate = new Date(leaseStartDate);
    const nextAnniversary = new Date(leaseDate);
    nextAnniversary.setFullYear(year);
    if (nextAnniversary <= new Date()) {
      nextAnniversary.setFullYear(year + 1);
    }

    const noticeDeadline = RentAdjustmentService.calculateNoticeDeadline(
      country,
      nextAnniversary.toISOString().split("T")[0],
    );

    const noticePeriodDays = RentAdjustmentService.getNoticePeriodDays(country);

    return {
      allowed,
      maxAllowedRent: Math.round(maxAllowedRent * 100) / 100,
      maxIncreasePct: Math.round(maxIncreasePct * 100) / 100,
      actualIncreasePct: Math.round(actualIncreasePct * 100) / 100,
      noticePeriodDays,
      noticeDeadline,
      reason,
      country,
    };
  }

  /**
   * Get the required notice period in days for a rent increase.
   * PT: 120 days notice required (NRAU Art. 32)
   * ES: 30 days notice (LAU Art. 18)
   */
  static getNoticePeriodDays(country: CountryCode): number {
    return NOTICE_PERIOD_DAYS[country];
  }

  /**
   * Calculate the date by which notice must be sent,
   * given a desired effective date for the rent increase.
   */
  static calculateNoticeDeadline(country: CountryCode, effectiveDate: string): string {
    const days = RentAdjustmentService.getNoticePeriodDays(country);
    const effective = new Date(effectiveDate);
    effective.setDate(effective.getDate() - days);
    return effective.toISOString().split("T")[0];
  }
}
