# DIASON Invoice Manager

Web app for creating, editing, printing, and downloading service invoices. Records live in a single MongoDB collection — the table and invoice view are the same data.

## Stack

- React + TypeScript (Vite)
- Express API
- MongoDB (Mongoose)
- Deployable on Vercel

No login or user accounts.

## Local setup

1. Install [Node.js](https://nodejs.org/) 20+.
2. Copy environment variables:

```bash
copy .env.example .env
```

3. Set `MONGODB_URI` in `.env` to your MongoDB Atlas (or local) connection string. Do not commit `.env`.
4. Install and run:

```bash
npm install
npm run dev
```

- App: http://127.0.0.1:5173
- API: http://127.0.0.1:4000

## Usage

- **Add Record** creates a row. Edit cells inline; values save when you leave a cell.
- **Total Rs.** is the sum of all charge columns. **Balance Rs.** is Total minus Advance.
- **Add Column** lets you add String, Date, or Float fields. Mark a float column as a **charge** so it appears on the invoice and is included in the total.
- Custom columns can be renamed or removed from the table header.
- **View Invoice** opens the DIASON A4 invoice. Use **Edit Invoice** to change values, then **Save / Update**. **Print Invoice** and **Download PDF** use the latest saved layout.

Default extra fields for the printed invoice: **Port** and **Arrival Date** (yellow highlights, matching the sample).

## Deploy on Vercel

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Add environment variable `MONGODB_URI` (Production).
4. Deploy. The Vite build becomes the static site; `/api/*` is handled by the Express app in `api/[[...path]].ts`.

Atlas must allow Vercel IPs (or `0.0.0.0/0` for development).
