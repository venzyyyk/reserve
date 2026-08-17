/**
 * Canonical money handling (MPS §8): amounts are integers in minor units
 * (kopiykas). Every money value in the app flows through `Money`.
 */
export interface Money {
  /** Integer amount in minor units (kopiykas for UAH). */
  readonly amount: number;
  readonly currency: "UAH";
}

export function uah(amountInKopiykas: number): Money {
  if (!Number.isSafeInteger(amountInKopiykas)) {
    throw new RangeError(
      `Money amount must be an integer of minor units, got ${amountInKopiykas}`,
    );
  }
  return { amount: amountInKopiykas, currency: "UAH" };
}

const wholeFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fractionalFormatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "700 ₴" for whole amounts, "700,50 ₴" otherwise — never "700,5 ₴". */
export function formatMoney(money: Money): string {
  const isWhole = money.amount % 100 === 0;
  return (isWhole ? wholeFormatter : fractionalFormatter).format(
    money.amount / 100,
  );
}

export function addMoney(a: Money, b: Money): Money {
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function multiplyMoney(m: Money, factor: number): Money {
  return { amount: Math.round(m.amount * factor), currency: m.currency };
}
