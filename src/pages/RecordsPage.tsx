import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { ColumnDefinition, InvoiceRecord } from "../types";
import { computeTotals, toDateInput } from "../format";
import AddColumnModal from "../components/AddColumnModal";

export default function RecordsPage() {
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [items, setItems] = useState<InvoiceRecord[]>([]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addColOpen, setAddColOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<ColumnDefinition | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const visibleColumns = useMemo(() => {
    const seen = new Set<string>();
    return columns.filter((c) => {
      if (c.key === "balanceRs" || seen.has(c.key)) return false;
      seen.add(c.key);
      return true;
    });
  }, [columns]);

  async function load(nextPage = page, nextQ = search) {
    setLoading(true);
    setError("");
    try {
      const [cols, list] = await Promise.all([api.listColumns(), api.listInvoices(nextQ, nextPage)]);
      setColumns(cols);
      setItems(list.items);
      setPages(list.pages);
      setTotal(list.total);
      setPage(list.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1, search);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  function rowValues(row: InvoiceRecord) {
    return { ...row.values, ...(drafts[row.id] ?? {}) };
  }

  function setCell(row: InvoiceRecord, key: string, value: unknown) {
    setDrafts((prev) => ({
      ...prev,
      [row.id]: { ...(prev[row.id] ?? {}), [key]: value },
    }));
  }

  async function persist(row: InvoiceRecord, extra: Record<string, unknown> = {}) {
    const draft = { ...(draftsRef.current[row.id] ?? {}), ...extra };
    if (Object.keys(draft).length === 0) return;
    setSavingId(row.id);
    try {
      const values = { ...row.values, ...draft };
      const updated = await api.updateInvoice(row.id, { values });
      setItems((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function importExcel(file: File) {
    setImporting(true);
    setError("");
    try {
      const result = await api.importExcel(file);
      const extra = result.unmatchedHeaders.length
        ? ` Skipped unmatched columns: ${result.unmatchedHeaders.join(", ")}.`
        : "";
      alert(
        `Imported ${result.inserted} record(s). ${result.skippedDuplicates} duplicate invoice number(s) skipped.${extra}`
      );
      await load(1, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function addRecord() {
    const today = new Date().toISOString().slice(0, 10);
    const created = await api.createInvoice({
      values: { date: today, invoiceNo: String(total + 1) },
    });
    setItems((prev) => [created, ...prev]);
    setTotal((n) => n + 1);
  }

  async function removeRecord(id: string) {
    if (!confirm("Delete this invoice record?")) return;
    await api.deleteInvoice(id);
    setItems((prev) => prev.filter((r) => r.id !== id));
    setTotal((n) => n - 1);
  }

  async function saveColumnEdit() {
    if (!editingCol) return;
    await api.updateColumn(editingCol._id, { label: editingCol.label, isCharge: editingCol.isCharge });
    setEditingCol(null);
    await load(page, search);
  }

  const infoColumns = useMemo(
    () => visibleColumns.filter((c) => !c.isCharge && c.key !== "advanceRs"),
    [visibleColumns]
  );
  const chargeColumns = useMemo(
    () => visibleColumns.filter((c) => c.isCharge || c.key === "advanceRs"),
    [visibleColumns]
  );

  function renderFieldInput(row: InvoiceRecord, col: ColumnDefinition, values: Record<string, unknown>) {
    if (col.type === "date") {
      return (
        <input
          type="date"
          value={toDateInput(values[col.key])}
          onChange={(e) => setCell(row, col.key, e.target.value)}
          onBlur={(e) => void persist(row, { [col.key]: e.target.value })}
          className="w-full bg-transparent px-2 py-1.5 outline-none"
        />
      );
    }
    if (col.type === "float") {
      return (
        <input
          type="number"
          step="0.01"
          value={values[col.key] === "" || values[col.key] == null ? "" : String(values[col.key])}
          onChange={(e) => setCell(row, col.key, e.target.value)}
          onBlur={(e) => void persist(row, { [col.key]: e.target.value })}
          className="w-full bg-transparent px-2 py-1.5 text-right outline-none"
        />
      );
    }
    return (
      <input
        value={String(values[col.key] ?? "")}
        onChange={(e) => setCell(row, col.key, e.target.value)}
        onBlur={(e) => void persist(row, { [col.key]: e.target.value })}
        className="w-full bg-transparent px-2 py-1.5 outline-none"
      />
    );
  }

  async function removeColumn(col: ColumnDefinition) {
    if (col.isSystem) return;
    if (!confirm(`Remove column "${col.label}"? Data in this column will be deleted.`)) return;
    await api.deleteColumn(col._id);
    await load(page, search);
  }

  function renderLabel(col: ColumnDefinition) {
    return (
      <div className="flex items-center gap-1">
        <span>{col.label}</span>
        {col.isCharge && <span className="rounded bg-gold/20 px-1 text-[10px] text-navy">Rs</span>}
        {!col.isSystem && (
          <>
            <button type="button" className="text-[10px] text-navy/60" onClick={() => setEditingCol(col)}>
              edit
            </button>
            <button type="button" className="text-[10px] text-red-600" onClick={() => void removeColumn(col)}>
              ×
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-black/10 bg-navy text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <Link to="/" className="text-xs text-white/70 hover:underline">
              ← Home
            </Link>
            <h1 className="font-serif text-2xl tracking-wide">Add Invoice Record</h1>
            <p className="text-xs text-white/70">Enter and save invoice data</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search M/s, invoice, chassis, vessel…"
              className="w-64 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none"
            />
            <button onClick={() => void addRecord()} className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-navy">
              Add Record
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void importExcel(file);
              }}
            />
            <button
              disabled={importing}
              onClick={() => importInputRef.current?.click()}
              className="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import Excel"}
            </button>
            <button onClick={() => setAddColOpen(true)} className="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
              Add Column
            </button>
            <Link to="/invoices" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-navy">
              View Invoices
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {editingCol && (
          <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-gold/40 bg-white p-3">
            <div>
              <label className="text-xs text-gray-500">Column label</label>
              <input
                value={editingCol.label}
                onChange={(e) => setEditingCol({ ...editingCol, label: e.target.value })}
                className="mt-1 block rounded-md border px-2 py-1 text-sm"
              />
            </div>
            {editingCol.type === "float" && !editingCol.isSystem && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editingCol.isCharge}
                  onChange={(e) => setEditingCol({ ...editingCol, isCharge: e.target.checked })}
                />
                Charge column
              </label>
            )}
            <button onClick={() => void saveColumnEdit()} className="rounded-md bg-navy px-3 py-1.5 text-sm text-white">
              Save column
            </button>
            <button onClick={() => setEditingCol(null)} className="text-sm text-gray-500">
              Cancel
            </button>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-white px-4 py-10 text-center text-gray-500">
            Loading records…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-white px-4 py-10 text-center text-gray-500">
            No records yet. Click Add Record to create an invoice.
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((row) => {
              const values = rowValues(row);
              const totals = computeTotals(values, columns);
              return (
                <section key={row.id} className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-navy px-4 py-3 text-white">
                    <div className="text-sm">
                      <span className="font-semibold">INV # {String(values.invoiceNo ?? "") || "—"}</span>
                      <span className="mx-2 text-white/40">·</span>
                      <span>{String(values.ms ?? "") || "New record"}</span>
                      {savingId === row.id && <span className="ml-2 text-[10px] text-white/60">saving</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => void removeRecord(row.id)} className="rounded bg-white/10 px-3 py-1.5 text-xs">
                        Delete
                      </button>
                    </div>
                  </div>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {infoColumns.map((col) => (
                        <tr key={col.key} className="border-t border-black/10">
                          <th className="w-[38%] bg-paper/80 px-3 py-2 text-left align-middle font-medium text-navy">
                            {renderLabel(col)}
                          </th>
                          <td className="px-1 py-0.5">{renderFieldInput(row, col, values)}</td>
                        </tr>
                      ))}
                      {chargeColumns.map((col) => (
                        <tr key={col.key} className="border-t border-black/10">
                          <th className="w-[38%] bg-paper/80 px-3 py-2 text-left align-middle font-medium text-navy">
                            {renderLabel(col)}
                          </th>
                          <td className="px-1 py-0.5">{renderFieldInput(row, col, values)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-black/20 bg-paper/50">
                        <th className="px-3 py-2 text-left font-semibold text-navy">Total Rs.</th>
                        <td className="px-3 py-2 text-right font-semibold">
                          {totals.totalRs ? totals.totalRs.toLocaleString("en-US") : ""}
                        </td>
                      </tr>
                      <tr className="border-t border-black/10 bg-paper/50">
                        <th className="px-3 py-2 text-left font-semibold text-navy">Balance Rs.</th>
                        <td className="px-3 py-2 text-right font-semibold">
                          {totals.balanceRs ? totals.balanceRs.toLocaleString("en-US") : ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            {total} record{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => void load(page - 1, search)} className="rounded border px-2 py-1 disabled:opacity-40">
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => void load(page + 1, search)}
              className="rounded border px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </main>

      <AddColumnModal
        open={addColOpen}
        onClose={() => setAddColOpen(false)}
        onSubmit={async (payload) => {
          await api.addColumn(payload);
          await load(page, search);
        }}
      />
    </div>
  );
}
