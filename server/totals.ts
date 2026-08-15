import type { ColumnDefinition } from "./defaults.js";

export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function computeTotals(
  values: Record<string, unknown>,
  columns: ColumnDefinition[]
) {
  const totalRs = columns
    .filter((c) => c.isCharge && c.type === "float")
    .reduce((sum, col) => sum + toNumber(values[col.key]), 0);

  const advanceRs = toNumber(values.advanceRs);
  const balanceRs = totalRs - advanceRs;

  return { totalRs, advanceRs, balanceRs };
}
