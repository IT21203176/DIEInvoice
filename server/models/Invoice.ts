import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    values: { type: mongoose.Schema.Types.Mixed, default: {} },
    remarks: { type: String, default: "" },
    totalRs: { type: Number, default: 0 },
    advanceRs: { type: Number, default: 0 },
    balanceRs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export interface InvoiceDoc extends mongoose.Document {
  values: Record<string, unknown>;
  remarks: string;
  totalRs: number;
  advanceRs: number;
  balanceRs: number;
  createdAt: Date;
  updatedAt: Date;
}

export const Invoice = mongoose.model<InvoiceDoc>("Invoice", invoiceSchema);
