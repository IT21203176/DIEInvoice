import { Router } from "express";
import { Party } from "../models/Party.js";

export const partiesRouter = Router();

partiesRouter.get("/", async (_req, res) => {
  const parties = await Party.find().sort({ name: 1 }).lean();
  res.json(
    parties.map((p) => ({
      id: String(p._id),
      name: p.name,
      address: p.address ?? "",
    }))
  );
});
