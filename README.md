# YieldKeeper

Smart portfolio management for modern landlords. Monitor rent, maintenance, compliance, and profitability from one dashboard.

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Database:** PostgreSQL (Railway)
- **ORM:** Prisma 7
- **Auth:** Clerk
- **Deployment:** Railway

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or use Railway / `prisma dev` for local)

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

- **DATABASE_URL:** PostgreSQL connection string (from Railway or `prisma dev`)
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** and **CLERK_SECRET_KEY:** From [Clerk Dashboard](https://dashboard.clerk.com)

### 3. Database setup

**Option A: Local with Prisma Dev (recommended for dev)**

```bash
npx prisma dev
```

This starts a local Postgres. Use the `postgres://` URL it prints for `DATABASE_URL`.

**Option B: Railway PostgreSQL**

Add a PostgreSQL service in Railway and use its connection string for `DATABASE_URL`.

**Then run migrations and seed:**

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up via Clerk, then access the dashboard.

## Project Structure

```
src/
├── app/
│   ├── (auth)/sign-in, sign-up
│   ├── dashboard/         # Protected dashboard routes
│   └── api/
├── components/
│   ├── ui/               # shadcn components
│   ├── dashboard/        # Dashboard widgets
│   └── layout/
├── lib/
│   ├── db.ts             # Prisma client
│   ├── auth.ts           # User sync from Clerk
│   └── mock-dashboard.ts # Mock data for dev
```

## Development Phases

- **Phase 1 (done):** Foundation, auth, dashboard UI with mock data
- **Phase 2:** Property & tenant management
- **Phase 3:** Rent tracking
- **Phase 4:** Real dashboard data from DB
- **Phase 5+:** Inspections, maintenance, compliance, SMS, documents

## Deploy to Railway

1. Connect your GitHub repo
2. Add PostgreSQL service
3. Add a new service for the Next.js app
4. Set environment variables (DATABASE_URL from Postgres, Clerk keys)
5. Deploy
