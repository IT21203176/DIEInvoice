import mongoose from "mongoose";
import type { ColumnType } from "../defaults.js";

const columnSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["string", "date", "float"], required: true },
    isCharge: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

export interface ColumnDoc extends mongoose.Document {
  key: string;
  label: string;
  type: ColumnType;
  isCharge: boolean;
  isSystem: boolean;
  order: number;
}

export const Column = mongoose.model<ColumnDoc>("Column", columnSchema);
