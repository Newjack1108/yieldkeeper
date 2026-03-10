# Railway Setup Guide

Deploy YieldKeeper to Railway in a few minutes. Your `railway.json` and `package.json` are already configured.

## Prerequisites

- [Railway account](https://railway.app) (GitHub login recommended)
- Code pushed to a GitHub repository

---

## Step 1: Create the Project

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project**.
3. Select **Deploy from GitHub repo**.
4. Connect GitHub if needed, then select your `YieldKeeper` repository.
5. Railway will create a service from the repo.

---

## Step 2: Add PostgreSQL

1. In your project, click **+ New**.
2. Choose **Database** → **PostgreSQL**.
3. Railway provisions Postgres and exposes `DATABASE_URL` automatically.

---

## Step 3: Link Database to Your App

1. Click your **Next.js service** (the one from GitHub).
2. Go to the **Variables** tab.
3. Click **Add variable** → **Add reference**.
4. Select the PostgreSQL service.
5. Choose `DATABASE_URL` from the dropdown.

Railway will add `DATABASE_URL` to your service. No need to copy the connection string.

---

## Step 4: (Optional) Add a Custom Domain

1. In your Next.js service, go to **Settings**.
2. Under **Networking**, click **Generate domain**.
3. Railway creates a URL like `yieldkeeper-production.up.railway.app`.

---

## Step 5: Deploy

1. Railway builds and deploys automatically on every push to your main branch.
2. **Pre-deploy**: `npx prisma migrate deploy` runs before each deploy (configured in `railway.json`).
3. **Start**: `npm run start` runs your Next.js app.
4. Visit your Railway URL to use the app.

---

## Step 6: Seed the Database (Optional)

To create the demo user and sample data:

```bash
# Install Railway CLI: npm i -g @railway/cli
railway login
railway link   # Select your project and Next.js service
railway run npx prisma db seed
```

Then sign in with **demo@yieldkeeper.com** / **password123**.

---

## Configuration Reference

| Setting | Value | Source |
|---------|-------|--------|
| Build command | `npm run build` | `railway.json` |
| Pre-deploy | `npx prisma migrate deploy` | `railway.json` |
| Start command | `npm run start` | `railway.json` |
| Health check | `/` | `railway.json` |
| Node version | 20+ | `package.json` engines |

---

## Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Add as reference from PostgreSQL service |
| Others | No | Lucia auth uses DB; no external keys needed |

---

## Troubleshooting

**Build fails with "Prisma Client not generated"**
- `npm run build` includes `prisma generate`; ensure your `package.json` build script is unchanged.

**Migrations fail**
- Ensure `DATABASE_URL` is set before deploy.
- Check the PostgreSQL service is running.
- Connection string must include `?sslmode=require` for Railway Postgres (Railway usually adds this).

**App won't start**
- Check logs in the Railway dashboard.
- Ensure `PORT` is not set manually (Railway injects it).
