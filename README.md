# Quotation Manager

A simple, fully responsive quotation management app.

- **Next.js 14** (App Router, JavaScript) + plain **CSS Modules**
- **MongoDB** via **Mongoose**
- **@react-pdf/renderer** for client-ready PDFs (generated in the browser)

## Features

- Dashboard with search, preview modal, edit, PDF download and delete (table on desktop, cards on mobile)
- One form for create and edit: details, overview, scope bullets, components (searchable dropdown, Retail/Bulk price per line, "Add New Component" modal), summary (override price, GST included / excluded / not applicable), payment milestones
- Quotation IDs like `CC-26H1-024`, generated with an atomic MongoDB counter, editable with a uniqueness check
- Stored snapshots of component name and price, so editing a component later never changes an old quotation
- PDF with the ₹ sign rendered correctly (bundled Noto Sans font), Indian number formatting, and the filename `{quotationId}_{clientName}.pdf`

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a MongoDB database (MongoDB Atlas)

1. Sign up at <https://www.mongodb.com/cloud/atlas> and create a free **M0** cluster.
2. **Database Access** → *Add New Database User* → choose a username and password (save them).
3. **Network Access** → *Add IP Address*. For local development add your current IP. For Vercel, add `0.0.0.0/0` (Vercel's IPs are not fixed).
4. **Database** → *Connect* → *Drivers* → copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/quotations?retryWrites=true&w=majority`
   Make sure the database name (`quotations` above) is in the path, and URL-encode special characters in the password.

Prefer a local database? Use `mongodb://127.0.0.1:27017/quotations`.

### 3. Configure the environment

```bash
cp .env.local.example .env.local      # Windows PowerShell: Copy-Item .env.local.example .env.local
```

Open `.env.local` and set `MONGODB_URI`.

### 4. (Optional) Add sample components

```bash
npm run seed
```

Adds: Raspberry Pi 4 1GB + Accessories, SpO₂ Sensor Module, Temperature Sensor Module, Breadboard & Wire, Power Supply.
The prices are placeholders; edit them in `scripts/seed.js` before seeding, or add your own components in the app. The script can be re-run safely; it skips components that already exist.

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## Customising

| What | Where |
| --- | --- |
| Company name, address, contact details, GSTIN, footer text on the PDF | [`lib/company.js`](lib/company.js) |
| Colors and spacing | CSS variables at the top of [`app/globals.css`](app/globals.css) |
| PDF layout | [`components/pdf/QuotationPdf.js`](components/pdf/QuotationPdf.js) |
| Default GST rate / validity days | [`lib/constants.js`](lib/constants.js) |

## Project structure

```
app/
  page.js                         Dashboard (/)
  quotations/new/page.js          Create form
  quotations/[id]/edit/page.js    Edit form
  api/components, api/quotations  Route handlers (+ /api/quotations/next-id)
components/                       QuotationForm, modals, combobox, toast, PDF document
lib/                              mongodb.js (cached connection), calc.js, company.js, ...
models/                           Component, Quotation, Counter
scripts/seed.js                   Sample data
public/fonts/                     Noto Sans (used by the PDF for ₹)
```

## How things work

- **Quotation ID**: `CC-{YY}{H1|H2}-{NNN}`, with the half-year taken from today's date in IST. The counter document `quotation-26H1` is incremented with `findOneAndUpdate({ $inc })`, which is atomic, so two simultaneous saves never get the same number. The ID shown in the form is only a preview; the real number is reserved when you save (if someone else saved first, you get the next one and the toast tells you the final ID). If you edit the ID yourself, it is checked for uniqueness instead.
- **Totals**: the server recomputes every total from the line items on save (`lib/calc.js`), so stored numbers always match the inputs.
- **Dashboard "Final Price"** shows the amount the client pays (the grand total), with a small note about GST.

## Deploying to Vercel

1. Push the project to GitHub (`.env.local` is git-ignored, so your secret stays local).
2. In Vercel: **Add New → Project**, import the repository. The Next.js preset is detected automatically.
3. Under **Environment Variables** add `MONGODB_URI` with your Atlas connection string (Production, Preview and Development).
4. In Atlas → **Network Access**, allow `0.0.0.0/0` so Vercel's serverless functions can connect.
5. Deploy. Run `npm run seed` locally against the same `MONGODB_URI` if you want the sample components in production.

Notes:

- The cached connection in `lib/mongodb.js` is reused across warm serverless invocations.
- PDFs are generated in the user's browser, so no server-side PDF rendering limits apply.
- No authentication is included. Anyone with the URL can view and edit quotations, so add auth (or Vercel deployment protection) before sharing the URL publicly.
