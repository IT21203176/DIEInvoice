import { useMemo } from "react";
import type { AppSettings, ColumnDefinition, InvoiceRecord, PartyRecord } from "../types";
import { formatAmount, formatAmountOrDash, formatDateDisplay, toNumber } from "../format";
import MsCombobox from "./MsCombobox";

interface Props {
  record: InvoiceRecord;
  columns: ColumnDefinition[];
  settings: AppSettings;
  parties: PartyRecord[];
  editing: boolean;
  draft: Record<string, unknown>;
  remarks: string;
  onChange: (key: string, value: unknown) => void;
  onRemarks: (value: string) => void;
}

function Field({
  editing,
  value,
  onChange,
  className = "",
}: {
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  if (!editing) {
    return <span className={className}>{value}</span>;
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border-b border-dashed border-gray-400 bg-yellow-50/60 px-1 outline-none ${className}`}
    />
  );
}

function Highlight({
  editing,
  children,
  value,
  onChange,
  type = "text",
}: {
  editing: boolean;
  children: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  if (editing) {
    return (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="invoice-highlight px-2 font-semibold outline-none"
      />
    );
  }
  return <span className="invoice-highlight">{children || "\u00A0"}</span>;
}

function AmountValue({
  editing,
  display,
  raw,
  onChange,
  double,
}: {
  editing: boolean;
  display: string;
  raw: string;
  onChange: (v: string) => void;
  double?: boolean;
}) {
  return (
    <div className={double ? "invoice-amount invoice-amount-double" : "invoice-amount"}>
      {editing ? (
        <input
          type="number"
          step="0.01"
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-yellow-50/60 text-right outline-none"
        />
      ) : (
        <div className="invoice-amount-text">{display}</div>
      )}
    </div>
  );
}

export default function InvoiceDocument({
  record,
  columns,
  settings,
  parties,
  editing,
  draft,
  remarks,
  onChange,
  onRemarks,
}: Props) {
  const values = editing ? draft : record.values;
  const chargeCols = useMemo(
    () => columns.filter((c) => c.isCharge && c.type === "float" && c.key !== "advanceRs" && c.key !== "balanceRs"),
    [columns]
  );
  const infoCols = useMemo(
    () =>
      columns.filter(
        (c) =>
          !c.isCharge &&
          ![
            "ms",
            "address",
            "date",
            "invoiceNo",
            "chassisNo",
            "vehicle",
            "vessel",
            "port",
            "arrivalDate",
            "advanceRs",
            "balanceRs",
          ].includes(c.key)
      ),
    [columns]
  );

  const total = chargeCols.reduce((s, c) => s + toNumber(values[c.key]), 0);
  const advance = toNumber(values.advanceRs);
  const balance = total - advance;
  const ms = String(values.ms ?? "");
  const msLines = ms.split("\n");

  return (
    <div id="invoice-sheet" className="print-sheet">
      <h1 className="invoice-company-name">{settings.companyName}</h1>
      <p className="mt-1 text-center text-[18px] font-semibold underline decoration-1 underline-offset-4">
        {settings.documentTitle}
      </p>

      <div className="mt-8 flex items-start justify-between">
        <div>
          <div className="flex gap-2">
            <span>M/s.</span>
            <div className="font-bold">
              {editing ? (
                <div className="w-72">
                  <MsCombobox
                    multiline
                    value={ms}
                    parties={parties}
                    onChange={(name) => onChange("ms", name)}
                    onSelect={(name, address) => {
                      onChange("ms", name);
                      onChange("address", address);
                    }}
                    className="border border-dashed border-gray-400 bg-yellow-50/60 p-1 font-bold"
                  />
                </div>
              ) : (
                <>
                  {msLines.map((line, i) => (
                    <div key={i}>{line || "\u00A0"}</div>
                  ))}
                  {String(values.address ?? "") ? <div>{String(values.address)}</div> : null}
                </>
              )}
              {editing && (
                <div className="mt-1">
                  <input
                    value={String(values.address ?? "")}
                    onChange={(e) => onChange("address", e.target.value)}
                    placeholder="Address"
                    className="w-72 border-b border-dashed border-gray-400 bg-yellow-50/60 p-1 font-normal outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span>Date: </span>
          {editing ? (
            <input
              type="date"
              value={String(values.date ?? "").slice(0, 10)}
              onChange={(e) => onChange("date", e.target.value)}
              className="border-b border-dashed border-gray-400 bg-yellow-50/60 outline-none"
            />
          ) : (
            <span className="font-semibold">{formatDateDisplay(values.date)}</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <span>Port : </span>
        <Highlight
          editing={editing}
          value={String(values.port ?? "")}
          onChange={(v) => onChange("port", v)}
        >
          {String(values.port ?? "")}
        </Highlight>
      </div>

      <div className="mt-5 grid grid-cols-3 items-end gap-4">
        <div>
          <div>
            INV #{" "}
            <Field
              editing={editing}
              value={String(values.invoiceNo ?? "")}
              onChange={(v) => onChange("invoiceNo", v)}
              className="font-bold"
            />
          </div>
          <div className="mt-3 font-bold uppercase">
            <Field
              editing={editing}
              value={String(values.vehicle ?? "")}
              onChange={(v) => onChange("vehicle", v)}
              className="font-bold uppercase"
            />
          </div>
        </div>
        <div className="text-center">
          <div className="font-bold underline">DESCRIPTION</div>
          <div className="mt-1 font-bold">
            <Field
              editing={editing}
              value={String(values.chassisNo ?? "")}
              onChange={(v) => onChange("chassisNo", v)}
              className="font-bold"
            />
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold underline">Vessel</div>
          <div className="mt-1 font-bold">
            <Field
              editing={editing}
              value={String(values.vessel ?? "")}
              onChange={(v) => onChange("vessel", v)}
              className="font-bold"
            />
          </div>
          <div className="mt-2">
            <Highlight
              editing={editing}
              type="date"
              value={String(values.arrivalDate ?? "").slice(0, 10)}
              onChange={(v) => onChange("arrivalDate", v)}
            >
              {formatDateDisplay(values.arrivalDate)}
            </Highlight>
          </div>
        </div>
      </div>

      {infoCols.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 pt-3 text-[12px]">
          {infoCols.map((col) => (
            <div key={col.key} className="flex justify-between gap-4">
              <span className="text-gray-600">{col.label}</span>
              {editing ? (
                <input
                  type={col.type === "date" ? "date" : col.type === "float" ? "number" : "text"}
                  value={
                    col.type === "date"
                      ? String(values[col.key] ?? "").slice(0, 10)
                      : String(values[col.key] ?? "")
                  }
                  onChange={(e) => onChange(col.key, e.target.value)}
                  className="w-40 border-b border-dashed border-gray-400 bg-yellow-50/60 text-right outline-none"
                />
              ) : (
                <span className="font-medium">
                  {col.type === "date"
                    ? formatDateDisplay(values[col.key])
                    : col.type === "float"
                      ? formatAmount(values[col.key])
                      : String(values[col.key] ?? "")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <div className="mb-2 flex justify-end pr-[4px] text-[12px] font-semibold">
          <span className="w-[150px] text-right">Remarks</span>
          <span className="ml-2 w-10 text-right font-normal">
            {editing ? (
              <input
                value={remarks}
                onChange={(e) => onRemarks(e.target.value)}
                className="w-10 bg-yellow-50/60 text-right outline-none"
              />
            ) : (
              remarks || "—"
            )}
          </span>
        </div>
        {chargeCols.map((col) => {
          const amount = toNumber(values[col.key]);
          const raw = values[col.key] === "" || values[col.key] == null ? "" : String(values[col.key]);
          return (
            <div key={col.key} className="invoice-charge-row">
              <div className="uppercase tracking-wide">{col.label}</div>
              <AmountValue
                editing={editing}
                display={formatAmountOrDash(amount)}
                raw={raw}
                onChange={(v) => onChange(col.key, v)}
              />
            </div>
          );
        })}
      </div>

      <div className="invoice-totals">
        <div className="invoice-rule" />
        <div className="invoice-total-row font-bold">
          <span>TOTAL Rs.</span>
          <div className="invoice-amount">
            <div className="invoice-amount-text">{formatAmount(total)}</div>
          </div>
        </div>
        <div className="invoice-rule" />
        <div className="invoice-total-row mt-3">
          <span>ADVANCE Rs.</span>
          <AmountValue
            editing={editing}
            display={formatAmountOrDash(advance)}
            raw={values.advanceRs === "" || values.advanceRs == null ? "" : String(values.advanceRs)}
            onChange={(v) => onChange("advanceRs", v)}
          />
        </div>
        <div className="invoice-total-row mt-3 font-bold">
          <span>BALANCE Rs.</span>
          <AmountValue
            editing={false}
            display={formatAmount(balance)}
            raw=""
            onChange={() => undefined}
            double
          />
        </div>
      </div>

      <div className="invoice-signature">
        <div className="invoice-signature-line" />
        <div className="invoice-signature-label">Authorized Signature</div>
      </div>
    </div>
  );
}
