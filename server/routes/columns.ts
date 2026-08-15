import { Router } from "express";
import { Column } from "../models/Column.js";
import { Invoice } from "../models/Invoice.js";
import { RESERVED_KEYS } from "../defaults.js";

function slugify(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || `col_${Date.now()}`;
}

export const columnsRouter = Router();

columnsRouter.get("/", async (_req, res) => {
  const columns = await Column.find().sort({ order: 1, createdAt: 1 });
  const seen = new Set<string>();
  const unique = columns.filter((col) => {
    if (seen.has(col.key)) return false;
    seen.add(col.key);
    return true;
  });
  res.json(unique);
});

columnsRouter.post("/", async (req, res) => {
  const { label, type, isCharge } = req.body as {
    label?: string;
    type?: "string" | "date" | "float";
    isCharge?: boolean;
  };

  if (!label?.trim()) {
    res.status(400).json({ error: "Column name is required" });
    return;
  }
  if (!type || !["string", "date", "float"].includes(type)) {
    res.status(400).json({ error: "Type must be string, date, or float" });
    return;
  }

  let key = slugify(label);
  if (RESERVED_KEYS.has(key) || (await Column.findOne({ key }))) {
    key = `${key}_${Date.now().toString(36)}`;
  }

  const last = await Column.findOne().sort({ order: -1 });
  const order = Math.max(last?.order ?? 0, 140) + 10;

  const column = await Column.create({
    key,
    label: label.trim(),
    type,
    isCharge: type === "float" ? Boolean(isCharge) : false,
    isSystem: false,
    order,
  });

  res.status(201).json(column);
});

columnsRouter.patch("/:id", async (req, res) => {
  const column = await Column.findById(req.params.id);
  if (!column) {
    res.status(404).json({ error: "Column not found" });
    return;
  }

  const { label, isCharge, order } = req.body as {
    label?: string;
    isCharge?: boolean;
    order?: number;
  };

  if (label?.trim()) column.label = label.trim();
  if (typeof order === "number") column.order = order;
  if (typeof isCharge === "boolean" && column.type === "float" && !column.isSystem) {
    column.isCharge = isCharge;
  }

  await column.save();
  res.json(column);
});

columnsRouter.delete("/:id", async (req, res) => {
  const column = await Column.findById(req.params.id);
  if (!column) {
    res.status(404).json({ error: "Column not found" });
    return;
  }
  if (column.isSystem) {
    res.status(400).json({ error: "System columns cannot be removed" });
    return;
  }

  const key = column.key;
  await column.deleteOne();
  await Invoice.updateMany({}, { $unset: { [`values.${key}`]: "" } });
  res.json({ ok: true });
});
