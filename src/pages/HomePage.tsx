import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <h1 className="font-serif text-5xl tracking-wide sm:text-6xl">DIASON ENTERPRISES</h1>
          <p className="mt-3 text-xl text-white/70 sm:text-2xl">Invoice Management</p>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-2">
        <Link
          to="/add"
          className="group rounded-3xl border border-black/10 bg-white p-12 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-navy text-4xl text-gold">+</div>
          <h2 className="text-3xl font-semibold text-navy">Add Invoice Record</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            Open the vertical data table to enter invoice details, charges, and custom columns.
          </p>
          <span className="mt-10 inline-block text-lg font-medium text-gold group-hover:underline">Continue →</span>
        </Link>
        <Link
          to="/invoices"
          className="group rounded-3xl border border-black/10 bg-white p-12 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gold text-4xl text-navy">☰</div>
          <h2 className="text-3xl font-semibold text-navy">View Invoices</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            Browse saved invoices and open any record to edit, print, or download as PDF.
          </p>
          <span className="mt-10 inline-block text-lg font-medium text-navy group-hover:underline">Continue →</span>
        </Link>
      </main>
    </div>
  );
}
