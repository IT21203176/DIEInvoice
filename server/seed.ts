import { Column } from "./models/Column.js";
import { Settings } from "./models/Settings.js";
import { DEFAULT_COLUMNS } from "./defaults.js";

let seeding: Promise<void> | null = null;

async function removeDuplicateColumns() {
  const columns = await Column.find().sort({ createdAt: 1 }).lean();
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  for (const col of columns) {
    if (seen.has(col.key)) {
      duplicateIds.push(String(col._id));
    } else {
      seen.add(col.key);
    }
  }
  if (duplicateIds.length > 0) {
    await Column.deleteMany({ _id: { $in: duplicateIds } });
  }
}

async function seedOnce() {
  await removeDuplicateColumns();

  const existing = await Column.find({}, { key: 1 }).lean();
  const keys = new Set(existing.map((c) => c.key));
  const missing = DEFAULT_COLUMNS.filter((c) => !keys.has(c.key));
  if (missing.length > 0) {
    await Column.bulkWrite(
      missing.map((col) => ({
        updateOne: {
          filter: { key: col.key },
          update: { $setOnInsert: col },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  const settingsCount = await Settings.countDocuments();
  if (settingsCount === 0) {
    await Settings.create({ companyName: "DIASON", documentTitle: "INVOICE" });
  }
}

export async function ensureDefaults() {
  if (!seeding) {
    seeding = seedOnce().catch((err) => {
      seeding = null;
      throw err;
    });
  }
  await seeding;
}
