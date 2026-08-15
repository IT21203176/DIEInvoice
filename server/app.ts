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
app.use((req, res, next) => {
  const contentType = String(req.headers["content-type"] || "");
  if (contentType.includes("multipart/form-data")) {
    next();
    return;
  }
  if (req.body != null && typeof req.body === "object") {
    next();
    return;
  }
  if (typeof req.body === "string") {
    try {
      req.body = JSON.parse(req.body || "{}");
    } catch {
      req.body = {};
    }
    next();
    return;
  }
  express.json({ limit: "2mb" })(req, res, next);
});

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

app.use("/api", (req, res) => {
  res.status(404).json({ error: `No route ${req.method} ${req.originalUrl}` });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
  if (name === "CastError") {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.status(500).json({ error: "Unexpected server error" });
});

export default app;
