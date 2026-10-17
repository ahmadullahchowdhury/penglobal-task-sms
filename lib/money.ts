import { CURRENCY, CURRENCY_LOCALE, MINOR_UNITS_PER_MAJOR } from "@/lib/constants";

const formatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: "currency",
  currency: CURRENCY,
});

// Money is stored as integer minor units. This is the only place it is formatted.
export function formatMoney(minorUnits: number): string {
  if (!Number.isInteger(minorUnits)) {
    throw new RangeError(`Money must be an integer in minor units, got ${minorUnits}`);
  }
  return formatter.format(minorUnits / MINOR_UNITS_PER_MAJOR);
}

// Parses what a person types ("1,250.50", "99", "£20.5") into integer minor units.
// Returns null for anything that is not a plain amount with at most 2 decimals.
export function parseMoneyToMinor(input: string): number | null {
  const cleaned = input.trim().replace(/^£/, "").replace(/,/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  return Number(whole) * MINOR_UNITS_PER_MAJOR + Number(fraction.padEnd(2, "0"));
}
