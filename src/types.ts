export type ColumnType = "string" | "date" | "float";

export interface ColumnDefinition {
  _id: string;
  key: string;
  label: string;
  type: ColumnType;
  isCharge: boolean;
  isSystem: boolean;
  order: number;
}

export interface InvoiceRecord {
  id: string;
  values: Record<string, unknown>;
  remarks: string;
  totalRs: number;
  advanceRs: number;
  balanceRs: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListResponse {
  items: InvoiceRecord[];
  total: number;
  page: number;
  pages: number;
}

export interface AppSettings {
  companyName: string;
  documentTitle: string;
}

export interface PartyRecord {
  id: string;
  name: string;
  address: string;
}
