import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "DIASON ENTERPRISES" },
    documentTitle: { type: String, default: "INVOICE" },
  },
  { timestamps: true }
);

export interface SettingsDoc extends mongoose.Document {
  companyName: string;
  documentTitle: string;
}

export const Settings = mongoose.model<SettingsDoc>("Settings", settingsSchema);
