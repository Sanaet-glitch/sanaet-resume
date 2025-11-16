# Pageclip ➜ Resend Webhook Relay

This folder contains a tiny Express server you can deploy to any Node-friendly host (Railway, Vercel, DigitalOcean App Platform, etc.). It receives POST requests from your Angular contact form (no Pageclip dependency required) and immediately forwards them to your inbox through [Resend](https://resend.com/), a generous developer-friendly transactional email service.

## ✨ Features
-	Accepts contact form webhooks at `POST /contact` and validates required fields.
-	Formats a readable email (plain text + HTML) with the submitted data and any additional payload fields.
-	Exposes `GET /health` for uptime checks.
-	Fully configurable via environment variables.

## 🔧 Environment variables
| Variable | Description |
| --- | --- |
| `RESEND_API_KEY` | API key from your Resend account. Generate it in Dashboard → API Keys. |
| `MAIL_FROM` | Verified Resend sender address or domain (e.g., `noreply@sanaet.tech`). |
| `MAIL_TO` | Destination inbox for notifications. |
| `BASIC_AUTH_USER` | Optional. Username required in the Basic Auth header. |
| `BASIC_AUTH_PASS` | Optional. Password required in the Basic Auth header. |
| `ALLOWED_ORIGINS` | Optional. Comma-separated list of origins allowed to call the webhook. Defaults to `*`. `http://localhost:4200` and `http://127.0.0.1:4200` are always added automatically so you can test locally even if you restrict production origins. |
| `SKIP_EMAIL` | Optional. Set to `true` during local development to skip the Resend call (payload is logged instead). |
| `PORT` | Optional. Defaults to `8080` when running locally. |

## 🚀 Local development
```bash
cd pageclip-webhook
SKIP_EMAIL=true MAIL_FROM=demo@example.com MAIL_TO=demo@example.com npm install
SKIP_EMAIL=true MAIL_FROM=demo@example.com MAIL_TO=demo@example.com npm run dev
```
Then POST JSON to `http://localhost:8080/contact` to simulate the form without touching Resend.

Example payload:
```bash
curl -X POST http://localhost:8080/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"George","email":"george@example.com","message":"Test"}'
```

## ☁️ Deployment suggestions
### Vercel
1. Install the [Vercel CLI](https://vercel.com/docs/cli) and run `vercel` inside `pageclip-webhook`.
2. When prompted for the build command, choose `npm run build`; output directory `dist`.
3. Add the env vars in the Vercel dashboard (Project → Settings → Environment Variables) and redeploy.
4. Your webhook URL will look like `https://your-vercel-app.vercel.app/pageclip`.

### Railway / DigitalOcean / Azure Functions
Any Node runtime that can run `npm run start` will work. Configure the same env vars and expose the service over HTTPS.

## 🔗 Integration modes

### 1. Direct form submission (no Pageclip)
1. Deploy this service and note the HTTPS URL (e.g., `https://hooks.sanaet.tech/contact`).
2. Update `environment.ts` / `environment.prod.ts` in the Angular app so `contactEndpoint` points to that URL.
3. Submissions will hit the webhook immediately, trigger Resend, and return `200` to the browser.

### 2. Keep Pageclip for storage + webhook for email
1. Leave the Angular app pointing to the `https://send.pageclip.co/...` endpoint so Pageclip keeps collecting entries.
2. Deploy this service and copy the `/contact` URL.
3. In the Pageclip dashboard, open **Integrations → Webhooks → Setup a Webhook** and paste the URL.
4. Each new Pageclip submission will now POST its payload to the relay, which extracts the `name`, `email`, and `message` fields (the server understands Pageclip’s JSON structure) and forwards the email via Resend.

You can even enable both flows simultaneously: Pageclip keeps the historical records, while Resend delivers instant inbox alerts.

## ✅ Troubleshooting
- **Invalid sender**: make sure the address in `MAIL_FROM` is verified inside Resend (Domains → verify + add DNS records).
- **Pageclip says URL invalid**: the URL must be publicly reachable over HTTPS and return `2xx` when Pageclip sends a test POST.
- **No emails**: check the server logs for `Email dispatch failed`; most often the Resend API key is missing or the sender isn’t verified.

Once this webhook is live, plug the URL into Pageclip and your contact form submissions will hit your inbox instantly.
