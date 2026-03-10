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

### 1. Create GitHub repository and push

If you haven't already, create a new repo at [github.com/new](https://github.com/new) named `YieldKeeper`. Do not initialize with README.

Then set the remote (replace `YOUR_USERNAME` with your GitHub username) and push:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YieldKeeper.git
git push -u origin main
```

### 2. Create Railway project

1. Go to [railway.app](https://railway.app) and sign in (GitHub recommended)
2. Click **New Project** > **Deploy from GitHub repo**
3. Select your `YieldKeeper` repository

### 3. Add PostgreSQL

1. In the project, click **+ New** > **Database** > **PostgreSQL**
2. Railway provisions Postgres and exposes `DATABASE_URL`

### 4. Configure the Next.js service

1. Click the **Next.js service** (from GitHub)
2. Go to **Variables** and add:
   - `DATABASE_URL` – Click **Add reference** and select your PostgreSQL service's `DATABASE_URL` (or use `${{Postgres.DATABASE_URL}}`)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` – from [Clerk Dashboard](https://dashboard.clerk.com)
   - `CLERK_SECRET_KEY` – from Clerk Dashboard
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` = `/dashboard` (optional)
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` = `/dashboard` (optional)

3. In **Settings**:
   - **Build Command:** `npm run build` (includes `prisma generate`)
   - **Start Command:** `npm run start`

### 5. Run migrations

After the first successful build, run migrations:

```bash
railway run npx prisma migrate deploy
```

Or add **Pre-deploy command** in Settings > Deploy: `npx prisma migrate deploy`

### 6. Seed (optional)

```bash
railway run npx prisma db seed
```

### 7. Clerk production URLs

In Clerk Dashboard > **Configure** > **Paths**, add your Railway URL (e.g. `https://yieldkeeper.up.railway.app`) to allowed redirect URLs.
