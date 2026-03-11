# Quarterly Checklist Cron (Railway)

The quarterly property checklists are sent automatically via SMS when tenants are due. On Railway, this requires an external cron service to trigger the endpoint.

## How it works

- Tenancies are due for a quarterly checklist based on **tenancy start date** (Q1, Q2, Q3, Q4 = every ~90 days)
- The endpoint `POST /api/cron/quarterly-checklists` finds due tenancies, creates checklist records, and sends SMS links via Twilio

## Setup on Railway

### 1. Environment variables

Set these in your Railway project:

| Variable | Description |
|----------|-------------|
| `WEBHOOK_BASE_URL` | Your app's public URL (e.g. `https://your-app.up.railway.app`) – used for checklist links in SMS |
| `CRON_SECRET` | Optional. If set, the cron request must include `Authorization: Bearer <CRON_SECRET>` |

### 2. Schedule the cron

Use an external service to call your endpoint on a schedule. Recommended: **monthly** (1st of each month at 9am):

| Service | Free tier | Setup |
|---------|-----------|-------|
| [cron-job.org](https://cron-job.org) | Yes | Create job → URL: `https://your-app.up.railway.app/api/cron/quarterly-checklists` → Method: POST → Schedule: `0 9 1 * *` (9am UTC, 1st of month) |
| [EasyCron](https://www.easycron.com) | Yes | Similar |
| [Uptime Robot](https://uptimerobot.com) | Yes | Monitor (ping) – less ideal for POST |

**If using CRON_SECRET**, add a header:
```
Authorization: Bearer YOUR_CRON_SECRET
```

Most cron services support custom headers in their settings.

### 3. Crontab expression

- `0 9 1 * *` = 9:00 UTC on the 1st of every month
- Adjust for your timezone (e.g. `0 9 1 * *` in UTC = 9am UTC)

## Manual trigger

You can also trigger the cron manually for testing:

```bash
curl -X POST https://your-app.up.railway.app/api/cron/quarterly-checklists
```

With auth (if CRON_SECRET is set):

```bash
curl -X POST https://your-app.up.railway.app/api/cron/quarterly-checklists \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
