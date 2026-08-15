import ExcelJS from "exceljs";
import type { ColumnDefinition, ColumnType } from "./defaults.js";
import { toNumber } from "./totals.js";

const SKIP_HEADERS = new Set(["total", "totalrs", "total rs", "total rs."]);

const HEADER_ALIASES: Record<string, string> = {
  ms: "ms",
  "m/s": "ms",
  "m/s.": "ms",
  address: "address",
  date: "date",
  invoiceno: "invoiceNo",
  "invoice no": "invoiceNo",
  "invoice no.": "invoiceNo",
  chassisno: "chassisNo",
  "chassis no": "chassisNo",
  "chassis no.": "chassisNo",
  chassis: "chassisNo",
  vehicle: "vehicle",
  vessel: "vessel",
  port: "port",
  arrivaldate: "arrivalDate",
  "arrival date": "arrivalDate",
  dochargers: "doChargers",
  "do chargers": "doChargers",
  "do charges": "doChargers",
  portchargers: "portChargers",
  "port chargers": "portChargers",
  "port charges": "portChargers",
  bankchargers: "bankChargers",
  "bank chargers": "bankChargers",
  "bank charges": "bankChargers",
  clearing: "clearing",
  transport: "transport",
  penalty: "penalty",
  advancers: "advanceRs",
  "advance rs": "advanceRs",
  "advance rs.": "advanceRs",
  advance: "advanceRs",
  remarks: "remarks",
};

export function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_./]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} /]+/gu, "")
    .trim();
}

function excelSerialToIso(serial: number): string {
  const utc = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (Number.isNaN(utc.getTime())) return "";
  return utc.toISOString().slice(0, 10);
}

function toIsoDate(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 20000 && value < 80000) return excelSerialToIso(value);
    return "";
  }
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum > 20000 && asNum < 80000) return excelSerialToIso(asNum);
  return "";
}

function cellRaw(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (value == null || value === "") return "";
  if (value instanceof Date) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if ("richText" in value) {
      return (value.richText ?? []).map((part) => part.text).join("");
    }
    if ("result" in value) {
      return value.result ?? "";
    }
    if ("text" in value) {
      return value.text ?? "";
    }
  }
  const text = cell.text?.trim();
  return text ?? "";
}

function coerce(value: unknown, type: ColumnType): unknown {
  if (value === null || value === undefined || value === "") return "";
  if (type === "date") return toIsoDate(value);
  if (type === "float") {
    const n = toNumber(value);
    return value === "" ? "" : n;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim().replace(/^"|"$/g, "");
}

function headerLookup(columns: ColumnDefinition[]) {
  const byHeader = new Map<string, ColumnDefinition | "remarks">();
  for (const col of columns) {
    byHeader.set(normalizeHeader(col.key), col);
    byHeader.set(normalizeHeader(col.label), col);
  }
  for (const [alias, key] of Object.entries(HEADER_ALIASES)) {
    if (key === "remarks") {
      byHeader.set(alias, "remarks");
      continue;
    }
    const col = columns.find((c) => c.key === key);
    if (col) byHeader.set(alias, col);
  }
  return byHeader;
}

export type MappedInvoice = {
  values: Record<string, unknown>;
  remarks: string;
};

export type ParseExcelResult = {
  rows: MappedInvoice[];
  unmatchedHeaders: string[];
};

export async function parseInvoiceWorkbook(
  buffer: Buffer,
  columns: ColumnDefinition[]
): Promise<ParseExcelResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], unmatchedHeaders: [] };
  }

  const lookup = headerLookup(columns);
  const unmatchedHeaders: string[] = [];
  const mapping: Array<{ col: number; target: ColumnDefinition | "remarks" }> = [];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const label = String(cell.text || cell.value || "").trim();
    if (!label) return;
    const norm = normalizeHeader(label);
    if (!norm || SKIP_HEADERS.has(norm)) return;
    if (/^\d+$/.test(norm)) return;
    const target = lookup.get(norm);
    if (!target) {
      unmatchedHeaders.push(label);
      return;
    }
    mapping.push({ col: colNumber, target });
  });

  const rows: MappedInvoice[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const sheetRow = sheet.getRow(r);
    const values: Record<string, unknown> = {};
    let remarks = "";
    let hasData = false;

    for (const { col, target } of mapping) {
      const raw = cellRaw(sheetRow.getCell(col));
      if (target === "remarks") {
        remarks = String(raw ?? "").trim();
        if (remarks) hasData = true;
        continue;
      }
      const coerced = coerce(raw, target.type);
      values[target.key] = coerced;
      if (coerced !== "" && coerced !== 0) hasData = true;
      if (target.type === "float" && coerced !== "") hasData = true;
    }

    if (!hasData) continue;
    for (const col of columns) {
      if (col.key === "balanceRs") continue;
      if (!(col.key in values)) values[col.key] = "";
    }
    rows.push({ values, remarks });
  }

  return { rows, unmatchedHeaders: [...new Set(unmatchedHeaders)] };
}
