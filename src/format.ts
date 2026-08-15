import type { ColumnDefinition } from "./types";

export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatAmount(value: unknown): string {
  const n = toNumber(value);
  if (!n) return "";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatAmountOrDash(value: unknown): string {
  const n = toNumber(value);
  if (!n) return "";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatDateDisplay(value: unknown): string {
  if (!value) return "";
  const raw = String(value);
  const d = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function toDateInput(value: unknown): string {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function computeTotals(values: Record<string, unknown>, columns: ColumnDefinition[]) {
  const totalRs = columns
    .filter((c) => c.isCharge && c.type === "float")
    .reduce((sum, col) => sum + toNumber(values[col.key]), 0);
  const advanceRs = toNumber(values.advanceRs);
  return { totalRs, advanceRs, balanceRs: totalRs - advanceRs };
}
