# QuadAgents Finance

A simple, private finance management web app for **QuadAgents Group** — tracks income, expenses, invoices, and reports across two brands: **QuadAgents** (AI solutions) and **Mansatak** (web/app/system solutions). Base currency is **SDG** (Sudanese Pound); USD / EUR / AED are supported.

Built for a small team. Anyone who signs up gets full access (team trust model — no per-user roles).

---

## Quick start (10 minutes)

You will need: a free Supabase account, Node.js 18+ installed, and 10 minutes.

### 1. Create your database on Supabase (3 min)

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub or email.
2. Click **New project**.
   - **Name**: `quadagents-finance` (or anything you like).
   - **Database password**: generate a strong one and **save it somewhere safe**.
   - **Region**: pick the closest one.
3. Wait ~2 minutes for the project to provision.
4. Once provisioned, in the left sidebar open **SQL Editor** → click **New query**.
5. Open the file `supabase/schema.sql` from this project in a text editor, copy the **entire** contents, paste into the Supabase SQL Editor, and click **Run**.
   - You should see "Success. No rows returned." Your tables, seed data, and permissions are now set up.

### 2. Grab your API keys (1 min)

1. In Supabase, click the gear icon (**Project Settings**) in the bottom-left → **API**.
2. Copy two things:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **`anon` `public` API key** (a long string starting with `eyJ...`)

### 3. Run the app locally (5 min)

Open a terminal in this folder (`quadagents-finance/`) and run:

```bash
npm install
```

Then create your local env file:

```bash
# macOS / Linux
cp .env.local.example .env.local

# Windows PowerShell
copy .env.local.example .env.local
```

Open `.env.local` and paste in the two values from step 2:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

Save the file, then start the dev server:

```bash
npm run dev
```

Open <http://localhost:3000> → click **Create one** to sign up your first user. You're in.

> **Note on email confirmation:** By default, Supabase sends a confirmation email before letting users sign in. For a small team, go to Supabase → **Authentication → Providers → Email** and turn **Confirm email** OFF so signups are instant. Keep it ON if you want the extra step.

---

## Deploy to Vercel (free, 5 minutes)

1. Push this folder to a GitHub repo (private recommended).
2. Go to <https://vercel.com> → **Add New → Project** → import your repo.
3. On the configuration screen, expand **Environment Variables** and add the same two keys as your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. In ~90 seconds you'll get a live URL (e.g. `https://quadagents-finance.vercel.app`).
5. Open it → sign up → you're live.

---

## Invite team members

Two ways, both work:

- **Self-serve:** share the `/signup` URL with your team. Anyone who signs up gets full access.
- **From Supabase:** open your Supabase project → **Authentication → Users → Invite user** → enter their email. They get an email, set a password, and log in.

There are no roles. Everyone on the team sees all data.

---

## First-time setup inside the app (2 min)

After your first login:

1. Open **Settings**.
2. **Exchange rates** — update USD/EUR/AED rates to today's values. These power the SDG conversions used throughout.
3. **Company information** — set your official company name, address, tax ID, and optionally a logo URL. These appear on every invoice PDF.
4. **Categories** — add any extra income/expense categories you want (the defaults cover most small businesses).

You can always come back and tweak these.

---

## Feature tour

- **Dashboard** — This month's income, expenses, net, YTD net. Last-6-months bar chart. Pie charts of expenses by category and income by brand. Last 10 transactions.
- **Transactions** — Ledger of every income and expense. Filter by date, type, brand, category. Original amount + SDG equivalent always visible.
- **Invoices** — Create multi-line invoices in any currency. Auto-numbered (`INV-2026-0001`). Download clean branded PDFs. "Mark as Paid" automatically creates a matching income transaction.
- **Clients & Vendors** — Everyone you bill or pay, linked to invoices and transactions.
- **Recurring** — Rent, salaries, subscriptions. Auto-logs once per month on or after the day you set. Safe to re-run — it won't duplicate.
- **Reports** — Filterable P&L by month, category breakdowns, brand comparison (QuadAgents vs Mansatak). Export CSV or Excel.
- **Settings** — Categories, exchange rates, company info.

---

## Tech stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS · shadcn/ui (Radix primitives) · Supabase (auth + Postgres) · Recharts · jsPDF · SheetJS · lucide-react · date-fns.

---

## UI components

The app's UI layer is built with **[shadcn/ui](https://ui.shadcn.com)** — a collection of accessible, copy-paste React components built on top of Radix UI and Tailwind CSS. Components are not an npm package; their source lives directly in this repo so you can tweak them freely.

- **Component source:** `src/components/ui/*` (one file per primitive: `button.tsx`, `input.tsx`, `card.tsx`, `dialog.tsx`, `select.tsx`, `table.tsx`, `tabs.tsx`, `toast.tsx`, `sheet.tsx`, etc.)
- **Utility helper:** `src/lib/utils.ts` exports `cn()` — merges Tailwind classes safely.
- **Toast hook:** `src/hooks/use-toast.ts` — import `toast` to show notifications anywhere.
- **Theme tokens:** `src/app/globals.css` (CSS variables) and `tailwind.config.ts`. Primary colour is mapped to indigo-600 (`--primary: 243 75% 59%`). Only the light theme is shipped.
- **Config:** `components.json` at the repo root — used by the shadcn CLI if you ever want to add more components.

### Adding more shadcn components

Pick anything from the [shadcn/ui components gallery](https://ui.shadcn.com/docs/components) and run (in your own terminal, not via the assistant):

```bash
npx shadcn@latest add <component-name>
```

For example: `npx shadcn@latest add accordion`. The CLI will drop a new file into `src/components/ui/` and add any missing Radix deps.

---

## Backup / data export

Everything lives in your Supabase Postgres. Recommended:

- **Regular exports:** use the **Reports** page → **Export Excel** for a snapshot you can keep in Google Drive.
- **Full DB backup:** Supabase dashboard → **Database → Backups** (free tier: 7 days of daily backups).

---

## Troubleshooting

- **"Can't sign up / stuck on 'check your email'"** — Turn off email confirmation in Supabase → Authentication → Providers → Email.
- **Blank dashboard after fresh install** — Make sure you ran `supabase/schema.sql` in its entirety. The seed data is inserted at the bottom of that file.
- **Wrong SDG totals after changing a rate** — Historical transactions keep the SDG value they were saved with. New transactions will use the new rate. This is intentional (so old months don't silently shift).
- **Invoice PDF looks off** — Add a proper company address and tax ID in Settings. The PDF is generated client-side from that data.
