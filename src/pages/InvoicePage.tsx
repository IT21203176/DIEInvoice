import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { api } from "../api";
import type { AppSettings, ColumnDefinition, InvoiceRecord, PartyRecord } from "../types";
import InvoiceDocument from "../components/InvoiceDocument";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<InvoiceRecord | null>(null);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ companyName: "DIASON ENTERPRISES", documentTitle: "INVOICE" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [parties, setParties] = useState<PartyRecord[]>([]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const [inv, cols, set, partyList] = await Promise.all([
          api.getInvoice(id),
          api.listColumns(),
          api.getSettings(),
          api.listParties(),
        ]);
        setRecord(inv);
        setColumns(cols);
        setSettings(set);
        setParties(partyList);
        setDraft(inv.values);
        setRemarks(inv.remarks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
      }
    })();
  }, [id]);

  function onChange(key: string, value: unknown) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateInvoice(id, { values: draft, remarks });
      setRecord(updated);
      setDraft(updated.values);
      setRemarks(updated.remarks);
      setParties(await api.listParties());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    const sheet = document.getElementById("invoice-sheet");
    if (!sheet) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(sheet, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: sheet.offsetWidth,
        height: sheet.offsetHeight,
        windowWidth: sheet.scrollWidth,
        windowHeight: sheet.scrollHeight,
        onclone: (_doc, cloned) => {
          cloned.style.boxShadow = "none";
          cloned.style.margin = "0";
        },
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(img, "PNG", 0, 0, pageWidth, pageHeight);
      const no = String(draft.invoiceNo || record?.values.invoiceNo || "invoice");
      pdf.save(`DIASON-Invoice-${no}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  if (error && !record) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
        <Link to="/invoices" className="mt-4 inline-block text-navy underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8 text-gray-500">Loading invoice…</div>;
  }

  return (
    <div className="invoice-print-root min-h-screen bg-[#d9d3c7] pb-10">
      <div className="no-print mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link to="/invoices" className="text-sm font-medium text-navy hover:underline">
          ← View Invoices
        </Link>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button
                onClick={() => {
                  setDraft(record.values);
                  setRemarks(record.remarks);
                  setEditing(false);
                }}
                className="rounded-md bg-white px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                disabled={saving}
                className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-white"
              >
                {saving ? "Saving…" : "Save / Update"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-white">
              Edit Invoice
            </button>
          )}
          <button onClick={() => window.print()} className="rounded-md bg-white px-3 py-2 text-sm font-medium">
            Print Invoice
          </button>
          <button
            onClick={() => void downloadPdf()}
            disabled={busy}
            className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-navy"
          >
            {busy ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>
      {error && <div className="no-print mx-auto mb-3 max-w-[900px] px-4 text-sm text-red-700">{error}</div>}
      <InvoiceDocument
        record={record}
        columns={columns}
        settings={settings}
        parties={parties}
        editing={editing}
        draft={draft}
        remarks={remarks}
        onChange={onChange}
        onRemarks={setRemarks}
      />
    </div>
  );
}
