/**
 * seed-tax-rules.ts
 *
 * Seed script for the TaxRule store (Wave 3.1).
 * Populates real 2025 and 2026 tax data for Portugal and Spain.
 *
 * Run with:
 *   DATABASE_URL=file:./dev.db npx ts-node --project tsconfig.json prisma/seed-tax-rules.ts
 * Or via prisma:
 *   npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Portugal — IRS 2025
// Source: Lei n.º 82-E/2014 (CIRS) as amended by Orçamento de Estado 2025
// ---------------------------------------------------------------------------

const PT_IRS_2025_BRACKETS = {
  brackets: [
    { min: 0, max: 7703, rate: 0.1325 },
    { min: 7703, max: 11623, rate: 0.18 },
    { min: 11623, max: 16472, rate: 0.23 },
    { min: 16472, max: 21321, rate: 0.26 },
    { min: 21321, max: 27146, rate: 0.3275 },
    { min: 27146, max: 39791, rate: 0.37 },
    { min: 39791, max: 51997, rate: 0.435 },
    { min: 51997, max: 81199, rate: 0.45 },
    { min: 81199, max: null, rate: 0.48 },
  ],
  maxRentalDeductiblePct: 0.35,
  rentalExpenseDeductible: true,
};

// PT 2026 — brackets unchanged until OE2026 is published; carry forward 2025 values
const PT_IRS_2026_BRACKETS = PT_IRS_2025_BRACKETS;

// PT NHR / IFICI 2025 — flat 20% on PT-source rental income
const PT_NHR_FLAT_2025 = {
  flatRate: 0.2,
  applicableIncome: "PT_SOURCE_RENTAL",
  notes: "Pre-2024 NHR holders: flat 20% on Category F (rental) income",
};

const PT_IFICI_FLAT_2025 = {
  flatRate: 0.2,
  applicableIncome: "PT_SOURCE_RENTAL",
  notes: "IFICI (post-2024 replacement for NHR): flat 20% on Category F (rental) income",
};

// PT withholding rate on rental income (retenção na fonte — Categoria F)
const PT_WITHHOLDING_2025 = {
  withholdingRate: 0.25,
  applicableTo: "RENTAL_INCOME_CATEGORY_F",
  notes: "Standard IRS withholding at source for rental income (Categoria F) — Art. 101 CIRS",
};

// PT Renda Acessível deductible rate — 30% additional deduction on net rental income
const PT_RENDA_ACESSIVEL_2025 = {
  additionalDeductionPct: 0.3,
  maxDeductiblePct: 0.65,
  applicableTo: "RENDA_ACESSIVEL_LEASES",
  notes: "Programa Renda Acessível: additional 30% deduction on net rental income (Art. 71 EBF)",
};

// ---------------------------------------------------------------------------
// Spain — IRPF 2025
// Source: Ley 35/2006 del IRPF as amended by PGE2025
// ---------------------------------------------------------------------------

const ES_IRPF_2025_BRACKETS = {
  brackets: [
    { min: 0, max: 12450, rate: 0.19 },
    { min: 12450, max: 20200, rate: 0.24 },
    { min: 20200, max: 35200, rate: 0.3 },
    { min: 35200, max: 60000, rate: 0.37 },
    { min: 60000, max: 300000, rate: 0.45 },
    { min: 300000, max: null, rate: 0.47 },
  ],
  rentalExpenseDeductionPct: 0.6,
  emptyPropertyReductionPct: 0.0,
};

// ES 2026 — same brackets until PGE2026 changes them
const ES_IRPF_2026_BRACKETS = ES_IRPF_2025_BRACKETS;

// ES withholding rate on rental income (retención a cuenta IRPF)
const ES_WITHHOLDING_2025 = {
  withholdingRate: 0.19,
  applicableTo: "RENTAL_INCOME_INMUEBLES",
  notes:
    "Standard IRPF withholding at source for rental income — Art. 101 LIRPF. Applies when payer is a company/self-employed.",
};

// ES non-resident flat rates (IRNR — Impuesto sobre la Renta de No Residentes)
const ES_NON_RESIDENT_2025 = {
  euEeaRate: 0.19,
  nonEuRate: 0.24,
  applicableTo: "NON_RESIDENT_RENTAL_INCOME",
  notes:
    "IRNR flat rates: 19% for EU/EEA tax residents, 24% for others — Art. 25 LIRNR (RDL 5/2004)",
};

// ---------------------------------------------------------------------------
// Italy — IRPEF / Cedolare Secca 2024–2025
// Source: D.Lgs. 23/2011 (Cedolare Secca), TUIR (DPR 917/1986 as amended)
// ---------------------------------------------------------------------------

const IT_CEDOLARE_SECCA_2024 = {
  flatRate: 0.21,
  notes: "Cedolare Secca standard rate — D.Lgs. 23/2011, Art. 3, c. 2",
};

const IT_CEDOLARE_CONCORDATO_2024 = {
  flatRate: 0.10,
  notes: "Cedolare Secca concordato rate (canone concordato) — D.Lgs. 23/2011, Art. 3, c. 3",
};

const IT_IRPEF_2024_BRACKETS = {
  brackets: [
    { min: 0, max: 28000, rate: 0.23 },
    { min: 28000, max: 50000, rate: 0.35 },
    { min: 50000, max: null, rate: 0.43 },
  ],
  maxRentalDeductiblePct: 0.35,
  notes: "IRPEF 2024 — D.L. 216/2023 (riforma fiscale). 3 scaglioni in vigore dal 1/1/2024.",
};

// Italy 2025 — same rates as 2024 (no changes enacted for 2025)
const IT_CEDOLARE_SECCA_2025 = IT_CEDOLARE_SECCA_2024;
const IT_CEDOLARE_CONCORDATO_2025 = IT_CEDOLARE_CONCORDATO_2024;
const IT_IRPEF_2025_BRACKETS = IT_IRPEF_2024_BRACKETS;

// ---------------------------------------------------------------------------
// Seed data array
// ---------------------------------------------------------------------------

interface TaxRuleSeed {
  country: string;
  regime: string;
  ruleType: string;
  year: number;
  effectiveDate: Date;
  payload: string;
  sourceUrl?: string;
  notes?: string;
}

const rules: TaxRuleSeed[] = [
  // ---- Portugal 2025 ----
  {
    country: "PT",
    regime: "STANDARD",
    ruleType: "INCOME_BRACKET",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(PT_IRS_2025_BRACKETS),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/82-e-2014-66015470",
    notes:
      "IRS 2025 income brackets — Categoria F rental income. Lei n.º 82-E/2014 (CIRS) as amended by OE2025.",
  },
  {
    country: "PT",
    regime: "STANDARD",
    ruleType: "WITHHOLDING_RATE",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(PT_WITHHOLDING_2025),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/82-e-2014-66015470",
    notes: "IRS withholding at source — Categoria F (Art. 101 CIRS).",
  },
  {
    country: "PT",
    regime: "NHR",
    ruleType: "FLAT_RATE",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(PT_NHR_FLAT_2025),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/89-2009-3506958",
    notes:
      "NHR (Non-Habitual Resident) flat 20% rate on PT-source rental income for pre-2024 holders.",
  },
  {
    country: "PT",
    regime: "IFICI",
    ruleType: "FLAT_RATE",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(PT_IFICI_FLAT_2025),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/82-e-2014-66015470",
    notes:
      "IFICI (Incentivo Fiscal à Investigação Científica e Inovação) flat 20% rate — OE2024 replacement for NHR regime.",
  },
  {
    country: "PT",
    regime: "RENDA_ACESSIVEL",
    ruleType: "DEDUCTIBLE_RATE",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(PT_RENDA_ACESSIVEL_2025),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/26-2020-136534536",
    notes:
      "Programa Renda Acessível additional deduction — Art. 71 EBF (Estatuto dos Benefícios Fiscais).",
  },

  // ---- Portugal 2026 ----
  {
    country: "PT",
    regime: "STANDARD",
    ruleType: "INCOME_BRACKET",
    year: 2026,
    effectiveDate: new Date("2026-01-01"),
    payload: JSON.stringify(PT_IRS_2026_BRACKETS),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/82-e-2014-66015470",
    notes: "IRS 2026 income brackets — carried forward from 2025 pending OE2026 publication.",
  },
  {
    country: "PT",
    regime: "STANDARD",
    ruleType: "WITHHOLDING_RATE",
    year: 2026,
    effectiveDate: new Date("2026-01-01"),
    payload: JSON.stringify(PT_WITHHOLDING_2025),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/82-e-2014-66015470",
    notes: "IRS withholding 2026 — carried forward from 2025.",
  },
  {
    country: "PT",
    regime: "NHR",
    ruleType: "FLAT_RATE",
    year: 2026,
    effectiveDate: new Date("2026-01-01"),
    payload: JSON.stringify(PT_NHR_FLAT_2025),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/89-2009-3506958",
    notes: "NHR flat rate 2026 — carried forward from 2025.",
  },
  {
    country: "PT",
    regime: "IFICI",
    ruleType: "FLAT_RATE",
    year: 2026,
    effectiveDate: new Date("2026-01-01"),
    payload: JSON.stringify(PT_IFICI_FLAT_2025),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/82-e-2014-66015470",
    notes: "IFICI flat rate 2026 — carried forward from 2025.",
  },
  {
    country: "PT",
    regime: "RENDA_ACESSIVEL",
    ruleType: "DEDUCTIBLE_RATE",
    year: 2026,
    effectiveDate: new Date("2026-01-01"),
    payload: JSON.stringify(PT_RENDA_ACESSIVEL_2025),
    sourceUrl: "https://diariodarepublica.pt/dr/detalhe/lei/26-2020-136534536",
    notes: "Renda Acessível deductible rate 2026 — carried forward from 2025.",
  },

  // ---- Spain 2025 ----
  {
    country: "ES",
    regime: "STANDARD",
    ruleType: "INCOME_BRACKET",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(ES_IRPF_2025_BRACKETS),
    sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
    notes:
      "IRPF 2025 general scale — Ley 35/2006 del IRPF as amended. Includes 60% rental expense deduction.",
  },
  {
    country: "ES",
    regime: "STANDARD",
    ruleType: "WITHHOLDING_RATE",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(ES_WITHHOLDING_2025),
    sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
    notes:
      "IRPF withholding on rental income — Art. 101 LIRPF. Applies when payer is an entrepreneur/company.",
  },
  {
    country: "ES",
    regime: "NHR",
    ruleType: "FLAT_RATE",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(ES_NON_RESIDENT_2025),
    sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2004-4527",
    notes: "IRNR (non-resident tax): 19% EU/EEA, 24% non-EU — RDL 5/2004 (Ley IRNR) Art. 25.",
  },

  // ---- Spain 2026 ----
  {
    country: "ES",
    regime: "STANDARD",
    ruleType: "INCOME_BRACKET",
    year: 2026,
    effectiveDate: new Date("2026-01-01"),
    payload: JSON.stringify(ES_IRPF_2026_BRACKETS),
    sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
    notes: "IRPF 2026 general scale — carried forward from 2025 pending PGE2026 publication.",
  },
  {
    country: "ES",
    regime: "STANDARD",
    ruleType: "WITHHOLDING_RATE",
    year: 2026,
    effectiveDate: new Date("2026-01-01"),
    payload: JSON.stringify(ES_WITHHOLDING_2025),
    sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
    notes: "IRPF withholding 2026 — carried forward from 2025.",
  },
  {
    country: "ES",
    regime: "NHR",
    ruleType: "FLAT_RATE",
    year: 2026,
    effectiveDate: new Date("2026-01-01"),
    payload: JSON.stringify(ES_NON_RESIDENT_2025),
    sourceUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2004-4527",
    notes: "IRNR flat rates 2026 — carried forward from 2025.",
  },

  // ---- Italy 2024 ----
  {
    country: "IT",
    regime: "CEDOLARE_SECCA",
    ruleType: "FLAT_RATE",
    year: 2024,
    effectiveDate: new Date("2024-01-01"),
    payload: JSON.stringify(IT_CEDOLARE_SECCA_2024),
    sourceUrl: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2011-03-14;23",
    notes: "Cedolare Secca standard rate 21% — D.Lgs. 23/2011, Art. 3, c. 2.",
  },
  {
    country: "IT",
    regime: "CEDOLARE_CONCORDATO",
    ruleType: "FLAT_RATE",
    year: 2024,
    effectiveDate: new Date("2024-01-01"),
    payload: JSON.stringify(IT_CEDOLARE_CONCORDATO_2024),
    sourceUrl: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2011-03-14;23",
    notes: "Cedolare Secca concordato rate 10% (canone concordato) — D.Lgs. 23/2011, Art. 3, c. 3.",
  },
  {
    country: "IT",
    regime: "STANDARD",
    ruleType: "INCOME_BRACKET",
    year: 2024,
    effectiveDate: new Date("2024-01-01"),
    payload: JSON.stringify(IT_IRPEF_2024_BRACKETS),
    sourceUrl: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1986-12-22;917",
    notes: "IRPEF 2024 brackets — D.L. 216/2023 riforma fiscale. 3 scaglioni: 23%/35%/43%.",
  },

  // ---- Italy 2025 ----
  {
    country: "IT",
    regime: "CEDOLARE_SECCA",
    ruleType: "FLAT_RATE",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(IT_CEDOLARE_SECCA_2025),
    sourceUrl: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2011-03-14;23",
    notes: "Cedolare Secca standard rate 21% 2025 — unchanged from 2024.",
  },
  {
    country: "IT",
    regime: "CEDOLARE_CONCORDATO",
    ruleType: "FLAT_RATE",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(IT_CEDOLARE_CONCORDATO_2025),
    sourceUrl: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2011-03-14;23",
    notes: "Cedolare Secca concordato rate 10% 2025 — unchanged from 2024.",
  },
  {
    country: "IT",
    regime: "STANDARD",
    ruleType: "INCOME_BRACKET",
    year: 2025,
    effectiveDate: new Date("2025-01-01"),
    payload: JSON.stringify(IT_IRPEF_2025_BRACKETS),
    sourceUrl: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1986-12-22;917",
    notes: "IRPEF 2025 brackets — carried forward from 2024 (no changes for 2025).",
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding TaxRule store...");

  let created = 0;
  let skipped = 0;

  for (const rule of rules) {
    const result = await prisma.taxRule.upsert({
      where: {
        country_regime_ruleType_year: {
          country: rule.country,
          regime: rule.regime,
          ruleType: rule.ruleType,
          year: rule.year,
        },
      },
      update: {
        effectiveDate: rule.effectiveDate,
        payload: rule.payload,
        sourceUrl: rule.sourceUrl,
        notes: rule.notes,
      },
      create: rule,
    });

    if (result) {
      console.log(`  ✓ ${rule.country} ${rule.regime} ${rule.ruleType} ${rule.year}`);
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. ${created} rules upserted, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
