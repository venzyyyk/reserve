import { addMoney, formatMoney, multiplyMoney, uah } from "../money";

// Intl separates the amount from ₴ with U+00A0; normalize for test readability.
const normalize = (s: string) => s.replace(/ /g, " ");

describe("money", () => {
  it("formats whole amounts without decimals", () => {
    expect(normalize(formatMoney(uah(70000)))).toBe("700 ₴");
  });

  it("formats fractional amounts with exactly two kopiyka digits", () => {
    expect(normalize(formatMoney(uah(70050)))).toBe("700,50 ₴");
  });

  it("rejects non-integer minor units", () => {
    expect(() => uah(10.5)).toThrow(RangeError);
  });

  it("adds and multiplies in integer space", () => {
    expect(addMoney(uah(100), uah(250)).amount).toBe(350);
    expect(multiplyMoney(uah(333), 0.5).amount).toBe(167);
  });
});
