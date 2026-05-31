/**
 * Shared tax identification number validation utilities
 * Portugal: NIF (Número de Identificação Fiscal)
 * Spain: NIF/NIE (Número de Identificación Fiscal / Número de Identidad de Extranjero)
 */

/**
 * Validate a Portuguese NIF (9 digits, check digit via mod 11)
 */
export function validatePortugueseNIF(nif: string): boolean {
  const clean = nif.replace(/\D/g, "");

  if (clean.length !== 9) return false;

  // First digit must be 1, 2, 3, 5, 6, 7, 8, or 9
  const firstDigit = parseInt(clean[0]);
  if (![1, 2, 3, 5, 6, 7, 8, 9].includes(firstDigit)) return false;

  // Calculate check digit (mod 11 algorithm)
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(clean[i]) * (9 - i);
  }

  const checkDigit = 11 - (sum % 11);
  const expectedCheckDigit = checkDigit >= 10 ? 0 : checkDigit;

  return parseInt(clean[8]) === expectedCheckDigit;
}

/**
 * Validate a Spanish NIF/NIE
 * NIF: 8 digits + control letter (Spanish citizens)
 * NIE: X/Y/Z + 7 digits + control letter (foreigners)
 */
export function validateSpanishNIF(nif: string): boolean {
  const clean = nif.replace(/\s|-/g, "").toUpperCase();

  // NIF: 8 digits + letter
  const nifPattern = /^(\d{8})([A-Z])$/;
  // NIE: X/Y/Z + 7 digits + letter
  const niePattern = /^([XYZ])(\d{7})([A-Z])$/;

  const letters = "TRWAGMYFPDXBNJZSQVHLCKE";

  if (nifPattern.test(clean)) {
    const [, number, letter] = clean.match(nifPattern)!;
    const expectedLetter = letters[parseInt(number) % 23];
    return letter === expectedLetter;
  }

  if (niePattern.test(clean)) {
    const [, prefix, number, letter] = clean.match(niePattern)!;
    const prefixMap: Record<string, string> = { X: "0", Y: "1", Z: "2" };
    const fullNumber = prefixMap[prefix] + number;
    const expectedLetter = letters[parseInt(fullNumber) % 23];
    return letter === expectedLetter;
  }

  return false;
}
