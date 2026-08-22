import mongoose from "mongoose";

const partySchema = new mongoose.Schema(
  {
    nameKey: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

export interface PartyDoc extends mongoose.Document {
  nameKey: string;
  name: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export const Party = mongoose.model<PartyDoc>("Party", partySchema);
