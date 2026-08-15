import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center">
          <h1 className="font-serif text-4xl tracking-wide">DIASON</h1>
          <p className="mt-1 text-sm text-white/70">Invoice Management</p>
        </div>
      </header>
      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-12 sm:grid-cols-2">
        <Link
          to="/add"
          className="group rounded-2xl border border-black/10 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-2xl text-gold">+</div>
          <h2 className="text-xl font-semibold text-navy">Add Invoice Record</h2>
          <p className="mt-2 text-sm text-gray-600">
            Open the vertical data table to enter invoice details, charges, and custom columns.
          </p>
          <span className="mt-6 inline-block text-sm font-medium text-gold group-hover:underline">Continue →</span>
        </Link>
        <Link
          to="/invoices"
          className="group rounded-2xl border border-black/10 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gold text-2xl text-navy">☰</div>
          <h2 className="text-xl font-semibold text-navy">View Invoices</h2>
          <p className="mt-2 text-sm text-gray-600">
            Browse saved invoices and open any record to edit, print, or download as PDF.
          </p>
          <span className="mt-6 inline-block text-sm font-medium text-navy group-hover:underline">Continue →</span>
        </Link>
      </main>
    </div>
  );
}
