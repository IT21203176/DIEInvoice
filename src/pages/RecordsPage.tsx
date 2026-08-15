import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { ColumnDefinition } from "../types";
import { computeTotals, toDateInput } from "../format";
import AddColumnModal from "../components/AddColumnModal";

function emptyValues(columns: ColumnDefinition[]) {
  const today = new Date().toISOString().slice(0, 10);
  const values: Record<string, unknown> = {};
  for (const col of columns) {
    if (col.key === "balanceRs") continue;
    values[col.key] = col.key === "date" ? today : "";
  }
  return values;
}

export default function RecordsPage() {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addColOpen, setAddColOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<ColumnDefinition | null>(null);
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

  const infoColumns = useMemo(
    () => visibleColumns.filter((c) => !c.isCharge && c.key !== "advanceRs"),
    [visibleColumns]
  );
  const chargeColumns = useMemo(
    () => visibleColumns.filter((c) => c.isCharge || c.key === "advanceRs"),
    [visibleColumns]
  );

  const totals = useMemo(() => computeTotals(values, columns), [values, columns]);

  async function loadColumns() {
    setLoading(true);
    setError("");
    try {
      const cols = await api.listColumns();
      setColumns(cols);
      setValues((prev) => {
        const next = emptyValues(cols);
        return Object.keys(prev).length ? { ...next, ...prev } : next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load columns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadColumns();
  }, []);

  function setField(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function saveRecord() {
    setSaving(true);
    setError("");
    try {
      const created = await api.createInvoice({ values });
      navigate(`/invoice/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
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
      navigate("/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function saveColumnEdit() {
    if (!editingCol) return;
    await api.updateColumn(editingCol._id, { label: editingCol.label, isCharge: editingCol.isCharge });
    setEditingCol(null);
    await loadColumns();
  }

  async function removeColumn(col: ColumnDefinition) {
    if (col.isSystem) return;
    if (!confirm(`Remove column "${col.label}"? Data in this column will be deleted.`)) return;
    await api.deleteColumn(col._id);
    await loadColumns();
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

  function renderFieldInput(col: ColumnDefinition) {
    if (col.type === "date") {
      return (
        <input
          type="date"
          value={toDateInput(values[col.key])}
          onChange={(e) => setField(col.key, e.target.value)}
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
          onChange={(e) => setField(col.key, e.target.value)}
          className="w-full bg-transparent px-2 py-1.5 text-right outline-none"
        />
      );
    }
    return (
      <input
        value={String(values[col.key] ?? "")}
        onChange={(e) => setField(col.key, e.target.value)}
        className="w-full bg-transparent px-2 py-1.5 outline-none"
      />
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
            <p className="text-xs text-white/70">Enter details and save a new invoice</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

        {loading ? (
          <div className="rounded-lg border border-black/10 bg-white px-4 py-10 text-center text-gray-500">
            Loading form…
          </div>
        ) : (
          <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-navy px-4 py-3 text-white">
              <div className="text-sm font-semibold">New invoice</div>
              <button
                disabled={saving}
                onClick={() => void saveRecord()}
                className="rounded bg-gold px-3 py-1.5 text-sm font-semibold text-navy disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Invoice"}
              </button>
            </div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {infoColumns.map((col) => (
                  <tr key={col.key} className="border-t border-black/10">
                    <th className="w-[38%] bg-paper/80 px-3 py-2 text-left align-middle font-medium text-navy">
                      {renderLabel(col)}
                    </th>
                    <td className="px-1 py-0.5">{renderFieldInput(col)}</td>
                  </tr>
                ))}
                {chargeColumns.map((col) => (
                  <tr key={col.key} className="border-t border-black/10">
                    <th className="w-[38%] bg-paper/80 px-3 py-2 text-left align-middle font-medium text-navy">
                      {renderLabel(col)}
                    </th>
                    <td className="px-1 py-0.5">{renderFieldInput(col)}</td>
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
        )}
      </main>

      <AddColumnModal
        open={addColOpen}
        onClose={() => setAddColOpen(false)}
        onSubmit={async (payload) => {
          await api.addColumn(payload);
          await loadColumns();
        }}
      />
    </div>
  );
}
