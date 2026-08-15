import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { connectDb } from "./db.js";
import { ensureDefaults } from "./seed.js";
import { Column } from "./models/Column.js";
import { Invoice } from "./models/Invoice.js";
import { computeTotals } from "./totals.js";
import type { ColumnDefinition } from "./defaults.js";
import { parseInvoiceWorkbook } from "./excelImport.js";

const filePath = path.resolve(process.argv[2] || "Workbook1.xlsx");

async function main() {
  await connectDb();
  await ensureDefaults();

  const buffer = await fs.readFile(filePath);
  const columns = (await Column.find().sort({ order: 1 })).map((c) => ({
    key: c.key,
    label: c.label,
    type: c.type,
    isCharge: c.isCharge,
    isSystem: c.isSystem,
    order: c.order,
  })) as ColumnDefinition[];

  const { rows, unmatchedHeaders } = await parseInvoiceWorkbook(buffer, columns);
  if (unmatchedHeaders.length) {
    console.log("Unmatched headers (skipped):", unmatchedHeaders.join(", "));
  }
  if (rows.length === 0) {
    throw new Error(`No invoice rows found in ${filePath}`);
  }

  const invoiceNos = rows.map((row) => String(row.values.invoiceNo ?? "").trim()).filter(Boolean);
  const existing = invoiceNos.length
    ? await Invoice.find({ "values.invoiceNo": { $in: invoiceNos } }, { "values.invoiceNo": 1 }).lean()
    : [];
  const existingNos = new Set(existing.map((doc) => String(doc.values?.invoiceNo ?? "")));

  const toInsert = rows.filter((row) => {
    const no = String(row.values.invoiceNo ?? "").trim();
    return !no || !existingNos.has(no);
  });

  const docs = toInsert.map((row) => {
    const totals = computeTotals(row.values, columns);
    return {
      values: { ...row.values, advanceRs: totals.advanceRs, balanceRs: totals.balanceRs },
      remarks: row.remarks,
      ...totals,
    };
  });

  if (docs.length > 0) {
    await Invoice.insertMany(docs);
  }

  console.log(
    `Imported ${docs.length} invoice(s) from ${path.basename(filePath)} (${rows.length - toInsert.length} duplicate invoice numbers skipped).`
  );
  await (await import("mongoose")).default.disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
