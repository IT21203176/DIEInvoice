import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { InvoiceRecord } from "../types";
import { formatAmount, formatDateDisplay } from "../format";

export default function InvoiceListPage() {
  const [items, setItems] = useState<InvoiceRecord[]>([]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  async function removeRecord(id: string) {
    if (!confirm("Delete this invoice?")) return;
    await api.deleteInvoice(id);
    setItems((prev) => prev.filter((r) => r.id !== id));
    setTotal((n) => Math.max(0, n - 1));
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10 bg-navy text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <Link to="/" className="text-xs text-white/70 hover:underline">
              ← Home
            </Link>
            <h1 className="font-serif text-2xl tracking-wide">View Invoices</h1>
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="overflow-auto rounded-lg border border-black/10 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy text-left text-xs uppercase tracking-wide text-white">
                <th className="px-3 py-2">Invoice No.</th>
                <th className="px-3 py-2">M/s.</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Chassis No.</th>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Vessel</th>
                <th className="px-3 py-2 text-right">Total Rs.</th>
                <th className="px-3 py-2 text-right">Balance Rs.</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2" />
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
                    <td className="border-t border-black/5 px-3 py-2 font-medium">{String(row.values.invoiceNo ?? "")}</td>
                    <td className="border-t border-black/5 px-3 py-2">{String(row.values.ms ?? "")}</td>
                    <td className="border-t border-black/5 px-3 py-2">{formatDateDisplay(row.values.date)}</td>
                    <td className="border-t border-black/5 px-3 py-2">{String(row.values.chassisNo ?? "")}</td>
                    <td className="border-t border-black/5 px-3 py-2">{String(row.values.vehicle ?? "")}</td>
                    <td className="border-t border-black/5 px-3 py-2">{String(row.values.vessel ?? "")}</td>
                    <td className="border-t border-black/5 px-3 py-2 text-right">{formatAmount(row.totalRs)}</td>
                    <td className="border-t border-black/5 px-3 py-2 text-right">{formatAmount(row.balanceRs)}</td>
                    <td className="border-t border-black/5 px-3 py-2">
                      <Link
                        to={`/invoice/${row.id}`}
                        className="rounded bg-navy px-2 py-1 text-xs font-medium text-white"
                      >
                        View Invoice
                      </Link>
                    </td>
                    <td className="border-t border-black/5 px-3 py-2">
                      <button onClick={() => void removeRecord(row.id)} className="text-xs text-red-600">
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
    </div>
  );
}
