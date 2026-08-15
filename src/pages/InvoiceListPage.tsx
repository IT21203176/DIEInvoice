import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { InvoiceRecord } from "../types";
import { formatAmount, formatDateDisplay } from "../format";
import HomeIcon from "../components/HomeIcon";

export default function InvoiceListPage() {
  const [items, setItems] = useState<InvoiceRecord[]>([]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load(nextPage = page, nextQ = search) {
    setLoading(true);
    setError("");
    try {
      const list = await api.listInvoices(nextQ, nextPage);
      setItems(list.items);
      setPages(list.pages);
      setTotal(list.total);
      setPage(list.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
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

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteInvoice(deleteId);
      setItems((prev) => prev.filter((r) => r.id !== deleteId));
      setTotal((n) => Math.max(0, n - 1));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function exportExcel() {
    setExporting(true);
    setError("");
    try {
      await api.exportExcel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10 bg-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <Link
            to="/"
            aria-label="Home"
            title="Home"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white hover:bg-white/10"
          >
            <HomeIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl leading-tight tracking-wide">View Invoices</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoices…"
              className="w-64 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none"
            />
            <Link to="/add" className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-navy">
              Add Invoice Record
            </Link>
            <button
              disabled={exporting}
              onClick={() => void exportExcel()}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-navy disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Import to Excel"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="overflow-auto rounded-lg border border-black/10 bg-white shadow-sm">
          <table className="w-full min-w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[13%]" />
              <col className="w-[8%]" />
              <col className="w-[14%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[13%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead>
              <tr className="bg-navy text-left text-xs uppercase tracking-wide text-white">
                <th className="px-4 py-3">Invoice No.</th>
                <th className="px-4 py-3">M/s.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Chassis No.</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Vessel</th>
                <th className="px-4 py-3 text-right">Total Rs.</th>
                <th className="px-4 py-3 text-right">Balance Rs.</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    Loading invoices…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    No invoices yet. Add a record first.
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => (
                  <tr key={row.id} className={idx % 2 ? "bg-paper/60" : "bg-white"}>
                    <td className="border-t border-black/5 px-4 py-3 font-medium">{String(row.values.invoiceNo ?? "")}</td>
                    <td className="border-t border-black/5 px-4 py-3">{String(row.values.ms ?? "")}</td>
                    <td className="border-t border-black/5 px-4 py-3 whitespace-nowrap">{formatDateDisplay(row.values.date)}</td>
                    <td className="border-t border-black/5 px-4 py-3 break-all">{String(row.values.chassisNo ?? "")}</td>
                    <td className="border-t border-black/5 px-4 py-3">{String(row.values.vehicle ?? "")}</td>
                    <td className="border-t border-black/5 px-4 py-3">{String(row.values.vessel ?? "")}</td>
                    <td className="border-t border-black/5 px-4 py-3 text-right tabular-nums">{formatAmount(row.totalRs)}</td>
                    <td className="border-t border-black/5 px-4 py-3 text-right tabular-nums">{formatAmount(row.balanceRs)}</td>
                    <td className="border-t border-black/5 px-4 py-3">
                      <Link
                        to={`/invoice/${row.id}`}
                        className="inline-block whitespace-nowrap rounded bg-navy px-4 py-2 text-sm font-medium text-white"
                      >
                        View Invoice
                      </Link>
                    </td>
                    <td className="border-t border-black/5 px-4 py-3">
                      <button
                        onClick={() => setDeleteId(row.id)}
                        className="whitespace-nowrap text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            {total} invoice{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => void load(page - 1, search)} className="rounded border px-2 py-1 disabled:opacity-40">
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button disabled={page >= pages} onClick={() => void load(page + 1, search)} className="rounded border px-2 py-1 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </main>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-navy">Delete invoice?</h2>
            <p className="mt-2 text-sm text-gray-600">
              This record will be permanently removed. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteId(null)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700"
              >
                No
              </button>
              <button
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
