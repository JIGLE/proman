export type {
  FiscalPlugin,
  RentalTaxParams,
  TaxCalculation,
  BracketBreakdown,
} from "./plugin-interface";
export { ptPlugin } from "./pt-plugin";
export { esPlugin } from "./es-plugin";
export { getPlugin, listCountries, registerPlugin } from "./plugin-registry";
