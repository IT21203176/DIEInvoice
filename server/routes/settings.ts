import { Router } from "express";
import { Settings } from "../models/Settings.js";

export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ companyName: "DIASON ENTERPRISES", documentTitle: "INVOICE" });
  }
  res.json({
    companyName: settings.companyName,
    documentTitle: settings.documentTitle,
  });
});

settingsRouter.patch("/", async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ companyName: "DIASON ENTERPRISES", documentTitle: "INVOICE" });
  }
  if (typeof req.body.companyName === "string" && req.body.companyName.trim()) {
    settings.companyName = req.body.companyName.trim();
  }
  if (typeof req.body.documentTitle === "string" && req.body.documentTitle.trim()) {
    settings.documentTitle = req.body.documentTitle.trim();
  }
  await settings.save();
  res.json({
    companyName: settings.companyName,
    documentTitle: settings.documentTitle,
  });
});
