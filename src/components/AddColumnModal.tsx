import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { label: string; type: "string" | "date" | "float"; isCharge: boolean }) => Promise<void>;
}

export default function AddColumnModal({ open, onClose, onSubmit }: Props) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"string" | "date" | "float">("float");
  const [isCharge, setIsCharge] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({ label: label.trim(), type, isCharge: type === "float" ? isCharge : false });
      setLabel("");
      setType("float");
      setIsCharge(true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add column");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-navy">Add Column</h2>
        <p className="mt-1 text-sm text-gray-600">
          Charge columns are added to invoice line items and included in Total Rs.
        </p>
        <label className="mt-4 block text-sm font-medium">Column name</label>
        <input
          autoFocus
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-navy"
          placeholder="e.g. Insurance"
        />
        <label className="mt-4 block text-sm font-medium">Data type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "string" | "date" | "float")}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-navy"
        >
          <option value="float">Float (amount / number)</option>
          <option value="string">String (text)</option>
          <option value="date">Date</option>
        </select>
        {type === "float" && (
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isCharge} onChange={(e) => setIsCharge(e.target.checked)} />
            Include as a charge on the invoice and in Total Rs.
          </label>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add Column"}
          </button>
        </div>
      </form>
    </div>
  );
}
