import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import { ensureDefaults } from "./seed.js";
import { invoicesRouter } from "./routes/invoices.js";
import { columnsRouter } from "./routes/columns.js";
import { settingsRouter } from "./routes/settings.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use(async (_req, res, next) => {
  try {
    await connectDb();
    await ensureDefaults();
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Database connection failed",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/invoices", invoicesRouter);
app.use("/api/columns", columnsRouter);
app.use("/api/settings", settingsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

export default app;
