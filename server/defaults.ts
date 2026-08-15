export type ColumnType = "string" | "date" | "float";

export interface ColumnDefinition {
  key: string;
  label: string;
  type: ColumnType;
  isCharge: boolean;
  isSystem: boolean;
  order: number;
}

export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { key: "ms", label: "M/s.", type: "string", isCharge: false, isSystem: true, order: 10 },
  { key: "address", label: "Address", type: "string", isCharge: false, isSystem: true, order: 15 },
  { key: "date", label: "Date", type: "date", isCharge: false, isSystem: true, order: 20 },
  { key: "invoiceNo", label: "Invoice No.", type: "string", isCharge: false, isSystem: true, order: 30 },
  { key: "chassisNo", label: "Chassis No.", type: "string", isCharge: false, isSystem: true, order: 40 },
  { key: "vehicle", label: "Vehicle", type: "string", isCharge: false, isSystem: true, order: 50 },
  { key: "vessel", label: "Vessel", type: "string", isCharge: false, isSystem: true, order: 60 },
  { key: "port", label: "Port", type: "string", isCharge: false, isSystem: true, order: 70 },
  { key: "arrivalDate", label: "Arrival Date", type: "date", isCharge: false, isSystem: true, order: 80 },
  { key: "doChargers", label: "DO Chargers", type: "float", isCharge: true, isSystem: true, order: 90 },
  { key: "portChargers", label: "PORT Chargers", type: "float", isCharge: true, isSystem: true, order: 100 },
  { key: "bankChargers", label: "Bank Chargers", type: "float", isCharge: true, isSystem: true, order: 110 },
  { key: "clearing", label: "Clearing", type: "float", isCharge: true, isSystem: true, order: 120 },
  { key: "transport", label: "Transport", type: "float", isCharge: true, isSystem: true, order: 130 },
  { key: "penalty", label: "Penalty", type: "float", isCharge: true, isSystem: true, order: 140 },
  { key: "advanceRs", label: "Advance Rs.", type: "float", isCharge: false, isSystem: true, order: 900 },
  { key: "balanceRs", label: "Balance Rs.", type: "float", isCharge: false, isSystem: true, order: 910 },
];

export const RESERVED_KEYS = new Set([
  ...DEFAULT_COLUMNS.map((c) => c.key),
  "totalRs",
  "remarks",
  "id",
  "_id",
  "values",
  "createdAt",
  "updatedAt",
]);
