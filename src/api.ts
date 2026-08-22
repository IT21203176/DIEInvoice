import type { AppSettings, ColumnDefinition, InvoiceListResponse, InvoiceRecord, PartyRecord } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data as T;
}

export const api = {
  listInvoices: (q: string, page = 1) =>
    request<InvoiceListResponse>(`/api/invoices?q=${encodeURIComponent(q)}&page=${page}&limit=50`),
  getInvoice: (id: string) => request<InvoiceRecord>(`/api/invoices/${id}`),
  createInvoice: (payload: { values: Record<string, unknown>; remarks?: string }) =>
    request<InvoiceRecord>("/api/invoices", { method: "POST", body: JSON.stringify(payload) }),
  exportExcel: async () => {
    const res = await fetch("/api/invoices/export");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || "Export failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DIASON-invoices.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  importExcel: async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/invoices/import", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || res.statusText);
    }
    return data as { inserted: number; skippedDuplicates: number; unmatchedHeaders: string[] };
  },
  updateInvoice: (id: string, payload: { values?: Record<string, unknown>; remarks?: string }) =>
    request<InvoiceRecord>(`/api/invoices/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteInvoice: (id: string) => request<{ ok: boolean }>(`/api/invoices/${id}`, { method: "DELETE" }),
  listColumns: () => request<ColumnDefinition[]>("/api/columns"),
  listParties: () => request<PartyRecord[]>("/api/parties"),
  addColumn: (payload: { label: string; type: string; isCharge: boolean }) =>
    request<ColumnDefinition>("/api/columns", { method: "POST", body: JSON.stringify(payload) }),
  updateColumn: (id: string, payload: Partial<Pick<ColumnDefinition, "label" | "isCharge">>) =>
    request<ColumnDefinition>(`/api/columns/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteColumn: (id: string) => request<{ ok: boolean }>(`/api/columns/${id}`, { method: "DELETE" }),
  getSettings: () => request<AppSettings>("/api/settings"),
  updateSettings: (payload: Partial<AppSettings>) =>
    request<AppSettings>("/api/settings", { method: "PATCH", body: JSON.stringify(payload) }),
};
