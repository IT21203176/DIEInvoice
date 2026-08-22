import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { Invoice } from "../models/Invoice.js";
import { Column } from "../models/Column.js";
import { computeTotals, toNumber } from "../totals.js";
import type { ColumnDefinition } from "../defaults.js";
import { parseInvoiceWorkbook } from "../excelImport.js";
import { upsertParty } from "../parties.js";

export const invoicesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

function serialize(doc: InstanceType<typeof Invoice>) {
  return {
    id: doc._id.toString(),
    values: doc.values ?? {},
    remarks: doc.remarks ?? "",
    totalRs: doc.totalRs,
    advanceRs: doc.advanceRs,
    balanceRs: doc.balanceRs,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function getColumns(): Promise<ColumnDefinition[]> {
  const columns = await Column.find().sort({ order: 1 });
  return columns.map((c) => ({
    key: c.key,
    label: c.label,
    type: c.type,
    isCharge: c.isCharge,
    isSystem: c.isSystem,
    order: c.order,
  }));
}

invoicesRouter.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50));

  const filter = q
    ? {
        $or: [
          { "values.ms": { $regex: q, $options: "i" } },
          { "values.address": { $regex: q, $options: "i" } },
          { "values.invoiceNo": { $regex: q, $options: "i" } },
          { "values.chassisNo": { $regex: q, $options: "i" } },
          { "values.vehicle": { $regex: q, $options: "i" } },
          { "values.vessel": { $regex: q, $options: "i" } },
          { "values.port": { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Invoice.countDocuments(filter),
  ]);

  res.json({
    items: items.map(serialize),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
});

invoicesRouter.get("/export", async (_req, res) => {
  const [columns, invoices] = await Promise.all([
    getColumns(),
    Invoice.find().sort({ createdAt: 1 }),
  ]);
  const exportCols = columns.filter((c) => c.key !== "balanceRs");
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Invoices");

  sheet.columns = [
    ...exportCols.map((col) => ({
      header: col.label,
      key: col.key,
      width: col.type === "string" ? 22 : 16,
    })),
    { header: "Total Rs.", key: "totalRs", width: 16 },
    { header: "Remarks", key: "remarks", width: 28 },
  ];

  for (const invoice of invoices) {
    const values = invoice.values ?? {};
    const row: Record<string, unknown> = { totalRs: invoice.totalRs, remarks: invoice.remarks ?? "" };
    for (const col of exportCols) {
      const raw = values[col.key];
      if (col.type === "float") {
        row[col.key] = raw === "" || raw == null ? null : toNumber(raw);
      } else if (col.type === "date" && raw) {
        row[col.key] = String(raw).slice(0, 10);
      } else {
        row[col.key] = raw == null ? "" : String(raw);
      }
    }
    sheet.addRow(row);
  }

  const floatKeys = [...exportCols.filter((c) => c.type === "float").map((c) => c.key), "totalRs"];
  sheet.eachRow((row, index) => {
    if (index === 1) {
      row.font = { bold: true };
      return;
    }
    for (const col of sheet.columns) {
      const key = String(col.key ?? "");
      if (!floatKeys.includes(key)) continue;
      const cell = row.getCell(key);
      if (typeof cell.value === "number") {
        cell.numFmt = "#,##0.00";
      }
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `DIASON-invoices.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
});

invoicesRouter.post("/import", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file?.buffer) {
    res.status(400).json({ error: "Upload an .xlsx file" });
    return;
  }
  if (!/\.xlsx$/i.test(file.originalname || "")) {
    res.status(400).json({ error: "Only .xlsx files are supported" });
    return;
  }

  const columns = await getColumns();
  const { rows, unmatchedHeaders } = await parseInvoiceWorkbook(file.buffer, columns);
  if (rows.length === 0) {
    res.status(400).json({ error: "No invoice rows found in the spreadsheet", unmatchedHeaders });
    return;
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
    for (const doc of toInsert) {
      await upsertParty(doc.values.ms, doc.values.address);
    }
  }

  res.json({
    inserted: docs.length,
    skippedDuplicates: rows.length - toInsert.length,
    unmatchedHeaders,
  });
});

invoicesRouter.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const doc = await Invoice.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(serialize(doc));
});

invoicesRouter.post("/", async (req, res) => {
  const columns = await getColumns();
  const values = (req.body.values ?? {}) as Record<string, unknown>;
  const remarks = String(req.body.remarks ?? "");
  const totals = computeTotals(values, columns);

  const doc = await Invoice.create({
    values: { ...values, advanceRs: totals.advanceRs, balanceRs: totals.balanceRs },
    remarks,
    ...totals,
  });
  await upsertParty(values.ms, values.address);
  res.status(201).json(serialize(doc));
});

invoicesRouter.patch("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const doc = await Invoice.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const columns = await getColumns();
  const incoming = (req.body.values ?? {}) as Record<string, unknown>;
  const values = { ...(doc.values ?? {}), ...incoming };
  if (typeof req.body.remarks === "string") {
    doc.remarks = req.body.remarks;
  }

  const totals = computeTotals(values, columns);
  doc.values = { ...values, advanceRs: totals.advanceRs, balanceRs: totals.balanceRs };
  doc.totalRs = totals.totalRs;
  doc.advanceRs = totals.advanceRs;
  doc.balanceRs = totals.balanceRs;
  await doc.save();
  await upsertParty(values.ms, values.address);
  res.json(serialize(doc));
});

invoicesRouter.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const doc = await Invoice.findByIdAndDelete(req.params.id);
  if (!doc) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json({ ok: true });
});
