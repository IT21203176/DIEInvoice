import { Column } from "./models/Column.js";
import { Settings } from "./models/Settings.js";
import { DEFAULT_COLUMNS } from "./defaults.js";
import { syncPartiesFromInvoices } from "./parties.js";
import { Party } from "./models/Party.js";

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

  await Column.updateOne({ key: "advanceRs" }, { $set: { order: 900, isCharge: false } });
  await Column.updateOne({ key: "balanceRs" }, { $set: { order: 910, isCharge: false } });

  const customColumns = await Column.find({ isSystem: false }).sort({ order: 1, createdAt: 1 });
  const lastSystemCharge = await Column.findOne({ isSystem: true, isCharge: true }).sort({ order: -1 });
  let nextOrder = Math.max(lastSystemCharge?.order ?? 140, 140) + 10;
  for (const col of customColumns) {
    if (col.order !== nextOrder) {
      col.order = nextOrder;
      await col.save();
    }
    nextOrder += 10;
  }

  await Settings.updateMany({}, { $set: { companyName: "DIASON ENTERPRISES" } });
  const settingsCount = await Settings.countDocuments();
  if (settingsCount === 0) {
    await Settings.create({ companyName: "DIASON ENTERPRISES", documentTitle: "INVOICE" });
  }

  const partyCount = await Party.countDocuments();
  if (partyCount === 0) {
    await syncPartiesFromInvoices();
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
