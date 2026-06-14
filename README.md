# QuadAgents Finance

A private finance management web app for **QuadAgents Group**. It tracks income, expenses, invoices, recurring expenses, clients/vendors, and reports across **QuadAgents**, **Mansatak**, and shared costs.

The app now runs on a regular **PostgreSQL** database. Supabase is not required.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS + shadcn/ui-style Radix components
- PostgreSQL via `pg`
- App-managed email/password auth with signed HTTP-only cookies
- Recharts, jsPDF, SheetJS

## Quick Start

You need Node.js 18+ and a PostgreSQL database.

1. Create a database:

```sql
create database quadagents_finance;
```

2. Run the schema:

```bash
psql "postgresql://postgres:postgres@localhost:5432/quadagents_finance" -f database/schema.sql
```

3. Create your env file:

```bash
copy .env.local.example .env.local
```

4. Edit `.env.local`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/quadagents_finance
SESSION_SECRET=replace-with-a-long-random-secret
POSTGRES_SSL=false
```

5. Install and run:

```bash
npm install
npm run dev
```

Open <http://localhost:3000/signup> and create the first user. Anyone with an account has full access to the finance workspace.

## Deploy

For Vercel or another Node-compatible host:

1. Provision a PostgreSQL database.
2. Run `database/schema.sql` against it.
3. Set these environment variables:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `POSTGRES_SSL=true` if your hosted database requires SSL
4. Deploy the app.

## Features

- **Dashboard**: monthly income, expenses, net, YTD net, charts, and recent transactions.
- **Transactions**: ledger for income and expenses with SDG equivalents.
- **Invoices**: multi-line invoices, PDF download, mark-as-sent, mark-as-paid.
- **Clients & Vendors**: contact records linked to invoices and transactions.
- **Recurring**: monthly recurring expenses, logged safely once per month.
- **Reports**: P&L, category breakdowns, brand comparison, CSV and Excel exports.
- **Settings**: categories, exchange rates, and company invoice information.

## Database Notes

The main schema lives at `database/schema.sql`.

Seeded currencies are:

- SDG
- USD
- EUR
- AED

Update exchange rates in **Settings** after your first login. Historical transactions keep their stored SDG values.

## Authentication Notes

Users are stored in the `app_users` table with PBKDF2 password hashes. Sessions are signed cookies using `SESSION_SECRET`.

This app is designed for a small trusted team. It does not implement roles or per-user data ownership.

## Troubleshooting

- **Signup says database connection failed**: check `DATABASE_URL` and make sure the database is reachable from the app.
- **Tables do not exist**: run `database/schema.sql`.
- **Users are logged out after deploy/restart**: make sure `SESSION_SECRET` is stable and not regenerated on each deploy.
- **Hosted Postgres requires SSL**: set `POSTGRES_SSL=true`.
