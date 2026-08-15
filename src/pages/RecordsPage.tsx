import { useEffect, useMemo, useState } from "react";
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

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 10.5 12 3.5l8.5 7v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-4v6H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" />
    </svg>
  );
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

  const visibleColumns = useMemo(() => {
    const seen = new Set<string>();
    return columns.filter((c) => {
      if (c.key === "balanceRs" || seen.has(c.key)) return false;
      seen.add(c.key);
      return true;
    });
  }, [columns]);

  const leftColumns = useMemo(
    () => visibleColumns.filter((c) => !c.isCharge && c.key !== "advanceRs"),
    [visibleColumns]
  );
  const rightColumns = useMemo(
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
          className="w-full bg-transparent px-2 py-2 outline-none"
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
          className="w-full bg-transparent px-2 py-2 text-right outline-none"
        />
      );
    }
    return (
      <input
        value={String(values[col.key] ?? "")}
        onChange={(e) => setField(col.key, e.target.value)}
        className="w-full bg-transparent px-2 py-2 outline-none"
      />
    );
  }

  function renderRows(cols: ColumnDefinition[]) {
    return cols.map((col) => (
      <tr key={col.key} className="h-11 border-t border-black/10">
        <th className="w-[40%] bg-paper/80 px-3 py-0 text-left align-middle font-medium text-navy">{renderLabel(col)}</th>
        <td className="px-1 py-0 align-middle">{renderFieldInput(col)}</td>
      </tr>
    ));
  }

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-black/10 bg-navy text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <Link
            to="/"
            aria-label="Home"
            title="Home"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white hover:bg-white/10"
          >
            <HomeIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl leading-tight tracking-wide">Add Invoice Record</h1>
            <p className="text-xs leading-tight text-white/70">Enter details and save a new invoice</p>
          </div>
          <button onClick={() => setAddColOpen(true)} className="shrink-0 rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
            Add Column
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4">
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
            <div className="grid lg:grid-cols-2">
              <table className="w-full border-collapse text-sm lg:border-r lg:border-black/10">
                <tbody>{renderRows(leftColumns)}</tbody>
              </table>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {renderRows(rightColumns)}
                  <tr className="h-11 border-t border-black/20 bg-paper/50">
                    <th className="w-[40%] px-3 py-0 text-left align-middle font-semibold text-navy">Total Rs.</th>
                    <td className="px-3 py-0 text-right align-middle font-semibold">
                      {totals.totalRs ? totals.totalRs.toLocaleString("en-US") : ""}
                    </td>
                  </tr>
                  <tr className="h-11 border-t border-black/10 bg-paper/50">
                    <th className="w-[40%] px-3 py-0 text-left align-middle font-semibold text-navy">Balance Rs.</th>
                    <td className="px-3 py-0 text-right align-middle font-semibold">
                      {totals.balanceRs ? totals.balanceRs.toLocaleString("en-US") : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
