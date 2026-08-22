import { useEffect, useMemo, useRef, useState } from "react";
import type { PartyRecord } from "../types";

type Props = {
  value: string;
  parties: PartyRecord[];
  onChange: (name: string) => void;
  onSelect: (name: string, address: string) => void;
  className?: string;
  multiline?: boolean;
};

export default function MsCombobox({ value, parties, onChange, onSelect, className = "", multiline = false }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return parties.slice(0, 20);
    return parties.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 20);
  }, [parties, value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const sharedClass = `w-full bg-transparent px-2 py-2 outline-none ${className}`;

  return (
    <div ref={rootRef} className="relative">
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          className={`${sharedClass} resize-none`}
          autoComplete="off"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          className={sharedClass}
          autoComplete="off"
        />
      )}
      {open && filtered.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-20 mt-0.5 max-h-48 overflow-auto rounded-md border border-black/15 bg-white py-1 shadow-lg">
          {filtered.map((party) => (
            <li key={party.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(party.name, party.address);
                  setOpen(false);
                }}
              >
                <div className="font-medium text-navy">{party.name}</div>
                {party.address ? <div className="text-xs text-gray-500">{party.address}</div> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
