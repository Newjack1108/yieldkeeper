# Twilio SMS Setup for YieldKeeper

YieldKeeper uses Twilio for sending and receiving SMS (rent reminders, overdue alerts, maintenance updates, etc.).

## Quick Setup

### 1. Create a Twilio Account

1. Go to [twilio.com/try-twilio](https://www.twilio.com/try-twilio) and sign up
2. Verify your phone number and email
3. You'll get access to the [Twilio Console](https://console.twilio.com)

### 2. Get Your Credentials

From the [Twilio Console Dashboard](https://console.twilio.com):

1. Find **Account SID** – visible on the dashboard
2. Find **Auth Token** – click the eye icon to reveal it (treat like a password!)
3. Copy both values

### 3. Get a Phone Number

1. In the Console, click **Phone Numbers** → **Manage** → **Buy a number**
2. Select a number with **SMS** capability
3. Trial accounts get one free number

### 4. Configure Environment Variables

Add to your `.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 5. Incoming SMS (tenant replies) – **required for inbound**

Add this to `.env` using your **public app URL** (where YieldKeeper is deployed):

```env
WEBHOOK_BASE_URL=https://yourdomain.com
```

Examples:
- Deployed on Vercel: `https://yieldkeeper.vercel.app`
- Deployed on Railway: `https://your-app.up.railway.app`
- Local dev with ngrok: `https://abc123.ngrok.io` (no trailing slash)

**Then configure Twilio:**

1. Go to [Twilio Console](https://console.twilio.com) → **Phone Numbers** → **Manage** → **Active numbers**
2. Click your Twilio phone number
3. Scroll to **Messaging configuration**
4. Under **A MESSAGE COMES IN**:
   - Set **Configure with** to **Webhook**
   - Set the URL to: `https://yourdomain.com/api/webhooks/twilio/sms`  
     (Use the **same** URL as `WEBHOOK_BASE_URL` + `/api/webhooks/twilio/sms`)
   - Set **HTTP** to **POST**
5. Click **Save** at the bottom

Incoming messages will appear in **Dashboard → SMS** and on the tenant’s profile.

---

## Incoming SMS not working? Troubleshooting

| Issue | Fix |
|-------|-----|
| **403 Forbidden** on webhook | Set `WEBHOOK_BASE_URL` to your **exact** public URL (no trailing slash). Twilio validates the request against this URL. |
| **Twilio can’t reach** your app | If on localhost, use [ngrok](https://ngrok.com): `ngrok http 3000` and set `WEBHOOK_BASE_URL=https://xxxx.ngrok.io` |
| **Messages don’t appear in app** | Tenant phone numbers must match. Incoming SMS are matched to tenants by phone; format differences (e.g. +1 vs no +1) are normalized, but the number must match exactly. |
| **Webhook URL in Twilio** | Must match exactly: `{WEBHOOK_BASE_URL}/api/webhooks/twilio/sms` – same protocol (https), no trailing slash on base. |

---

## Test Mode

If Twilio credentials are **not** set, the app runs in **test mode**:
- Messages are logged to the database but **not sent**
- UI shows "Twilio credentials not configured"

No changes to code are needed – just add the env vars to go live.

---

## Security

- **Never** commit `.env` or credentials to git
- Keep `TWILIO_AUTH_TOKEN` secret
- Regenerate the Auth Token in Console if it's ever exposed
