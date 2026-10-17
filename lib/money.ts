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
