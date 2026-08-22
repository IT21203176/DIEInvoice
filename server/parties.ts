import { Party } from "./models/Party.js";
import { Invoice } from "./models/Invoice.js";

export function partyNameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizePartyName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export async function upsertParty(ms: unknown, address: unknown) {
  const name = normalizePartyName(String(ms ?? ""));
  if (!name) return;
  const nameKey = partyNameKey(name);
  const addr = String(address ?? "").trim();
  await Party.findOneAndUpdate(
    { nameKey },
    { $set: { name, address: addr } },
    { upsert: true, new: true }
  );
}

export async function syncPartiesFromInvoices() {
  const invoices = await Invoice.find(
    { "values.ms": { $exists: true, $nin: [null, ""] } },
    { values: 1, updatedAt: 1 }
  )
    .sort({ updatedAt: -1 })
    .lean();

  const seen = new Set<string>();
  for (const inv of invoices) {
    const raw = String(inv.values?.ms ?? "");
    const name = normalizePartyName(raw);
    const nameKey = partyNameKey(name);
    if (!nameKey || seen.has(nameKey)) continue;
    seen.add(nameKey);
    await Party.findOneAndUpdate(
      { nameKey },
      { $set: { name, address: String(inv.values?.address ?? "").trim() } },
      { upsert: true }
    );
  }
}
