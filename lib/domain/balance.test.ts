import { describe, expect, it } from "vitest";
import { computeBalance, computeOverdue, exceedsBalance } from "./balance";

const now = new Date("2026-06-30T12:00:00.000Z");
const day = (s: string) => new Date(`${s}T12:00:00.000Z`);
const charge = (amount: number, due: string) => ({ amount, dueDate: day(due) });

describe("computeBalance", () => {
  it("is zero when fully paid", () => {
    expect(computeBalance([charge(10000, "2026-01-01")], [{ amount: 10000 }])).toBe(0);
  });
  it("is the remainder when partly paid", () => {
    expect(computeBalance([charge(10000, "2026-01-01")], [{ amount: 4000 }])).toBe(6000);
  });
  it("sums several charges", () => {
    expect(
      computeBalance([charge(5000, "2026-01-01"), charge(5000, "2026-02-01")], [{ amount: 2000 }]),
    ).toBe(8000);
  });
  it("puts the money back after a reversal", () => {
    expect(
      computeBalance([charge(10000, "2026-01-01")], [{ amount: 10000 }, { amount: -10000 }]),
    ).toBe(10000);
  });
  it("is zero with no charges", () => {
    expect(computeBalance([], [])).toBe(0);
  });
});

describe("exceedsBalance", () => {
  it("allows paying exactly the balance but not more", () => {
    expect(exceedsBalance(5000, 5000)).toBe(false);
    expect(exceedsBalance(5000, 5001)).toBe(true);
    expect(exceedsBalance(0, 1)).toBe(true);
  });
});

describe("computeOverdue", () => {
  it("is not overdue when fully paid", () => {
    expect(computeOverdue([charge(10000, "2026-01-01")], [{ amount: 10000 }], now)).toEqual({
      overdueAmount: 0,
      daysOverdue: 0,
    });
  });

  it("is not overdue when nothing is due yet", () => {
    expect(computeOverdue([charge(10000, "2026-07-15")], [], now)).toEqual({
      overdueAmount: 0,
      daysOverdue: 0,
    });
  });

  it("is overdue for the whole charge when past due with no payment", () => {
    // 2026-06-20 12:00 to 2026-06-30 12:00 is exactly 10 days
    expect(computeOverdue([charge(10000, "2026-06-20")], [], now)).toEqual({
      overdueAmount: 10000,
      daysOverdue: 10,
    });
  });

  it("is overdue only for the unpaid part after a partial payment", () => {
    expect(computeOverdue([charge(10000, "2026-06-20")], [{ amount: 3000 }], now)).toEqual({
      overdueAmount: 7000,
      daysOverdue: 10,
    });
  });

  it("applies payments to the oldest charge first", () => {
    const charges = [charge(5000, "2026-06-10"), charge(5000, "2026-06-20")];
    // 5000 clears the oldest, so the 20 June charge is the oldest uncovered one
    expect(computeOverdue(charges, [{ amount: 5000 }], now)).toEqual({
      overdueAmount: 5000,
      daysOverdue: 10,
    });
    // 2000 leaves the oldest partly uncovered, so days run from 10 June
    expect(computeOverdue(charges, [{ amount: 2000 }], now)).toEqual({
      overdueAmount: 8000,
      daysOverdue: 20,
    });
  });

  it("does not count an uncovered charge that is not yet due", () => {
    const charges = [charge(5000, "2026-06-10"), charge(5000, "2026-08-01")];
    expect(computeOverdue(charges, [], now)).toEqual({ overdueAmount: 5000, daysOverdue: 20 });
  });

  it("does not depend on the order charges are passed in", () => {
    const a = [charge(5000, "2026-06-20"), charge(5000, "2026-06-10")];
    const b = [...a].reverse();
    expect(computeOverdue(a, [{ amount: 5000 }], now)).toEqual(
      computeOverdue(b, [{ amount: 5000 }], now),
    );
  });

  it("is overdue again after a payment is reversed", () => {
    const charges = [charge(10000, "2026-06-20")];
    expect(computeOverdue(charges, [{ amount: 10000 }, { amount: -10000 }], now)).toEqual({
      overdueAmount: 10000,
      daysOverdue: 10,
    });
  });

  it("is not overdue exactly on the due date", () => {
    expect(computeOverdue([charge(10000, "2026-06-30")], [], now)).toEqual({
      overdueAmount: 0,
      daysOverdue: 0,
    });
  });

  it("is one day overdue a moment after the due date", () => {
    const justAfter = new Date(now.getTime() + 1);
    expect(computeOverdue([charge(10000, "2026-06-30")], [], justAfter)).toEqual({
      overdueAmount: 10000,
      daysOverdue: 1,
    });
  });
});
