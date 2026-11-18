# Hearth

Hearth is a role-based elderly-care coordination application for elders, caretakers, and family members. It currently provides medication schedules and dose tracking, appointments, caregiver suggestions, circle settings, audit events, AI-assisted medication entry, and reminder workflows.

> **Launch status: NOT READY for real-world healthcare use.** This repository has incomplete health-record, vitals, and emergency-response workflows; reminder reliability and authorization coverage need further verification; and the production dependency audit reports unresolved vulnerabilities. The application is not a medical device or emergency service.

## Technology and architecture

- **Client:** React 18, TypeScript, Vite, Tailwind CSS, React Router.
- **Server:** Node.js 20+, Express, TypeScript, Zod.
- **Persistence:** Firebase Admin / Firestore. A local in-memory repository is available only when explicitly enabled outside production.
- **Integrations:** Google Gemini for AI-assisted features, Nodemailer/SMTP for email, and `node-cron` for optional in-process reminders.

The browser sends API requests to the Express server. The server authenticates role-based circle sessions, validates requests, calls repositories and integrations, and serves the built client in production. Firestore is the intended persistent store; in-memory data is temporary and is lost when the process exits.

```text
client/  React app, components, pages, tests
server/  Express API, repositories, jobs, services, tests
scripts/ Project scripts
```

## Prerequisites

- Node.js 20 or newer and npm.
- Firestore emulator for local persistence, or Google Cloud credentials for a configured Firestore project.
- Optional: Gemini API key for real AI scanning/parsing and SMTP credentials for email delivery.

## Local setup

From the repository root:

```powershell
npm ci
Copy-Item .env.example .env
```

The example configuration explicitly enables the in-memory store for local development. It is not persistent and must not be used for production. For local Firestore persistence, configure `FIRESTORE_EMULATOR_HOST` and `GOOGLE_CLOUD_PROJECT` instead. Do not put production credentials in `.env` or commit them.

Start the client and API together:

```powershell
npm run dev
```

The Vite client runs at `http://localhost:5173` and proxies `/api` requests to the server at `http://localhost:8080`. There is no automatic production demo account. Create a circle through the registration flow; do not use seeded/demo data for real people.

## Environment configuration

See [.env.example](./.env.example) for names and placeholder values.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production`. |
| `PORT` | Express listening port. |
| `APP_URL`, `CLIENT_ORIGIN` | Application URL and allowed browser origin. |
| `JWT_SECRET` | Required in production; at least 32 characters. |
| `INTERNAL_SCHEDULER_SECRET` | Required in production; at least 32 characters. |
| `ALLOW_IN_MEMORY_STORE` | Local-only explicit opt-in. Must be false in production. |
| `ALLOW_DEMO_SEED` | Local-only opt-in for sample seed data. The seed script is rejected in production. |
| `FIRESTORE_EMULATOR_HOST`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS` | Firestore emulator/project configuration or credential path. On Cloud Run, use the attached service identity instead of a key file. |
| `GEMINI_API_KEY` | Optional Gemini integration. AI output must be independently reviewed; prescription scanning returns no extracted medications when unavailable. |
| `ENABLE_CRON` | Enables the in-process reminder scheduler. Keep disabled on multi-instance/serverless production deployments unless a single-worker guarantee is implemented. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional email transport configuration. Without SMTP, email is dry-run only and is not delivered. |

Production startup validates required secrets and Firestore configuration and exits rather than silently using in-memory storage.

## Netlify frontend with a separate backend

The client uses same-origin `/api` requests and stores authentication in an HTTP-only cookie. Netlify must proxy these paths to the deployed Express backend; pointing the browser directly at a different backend domain can prevent the cookie from being sent.

1. Deploy the Express backend to Cloud Run as described in [deploy.md](./deploy.md).
2. Set the backend's `CLIENT_ORIGIN` to `https://hearthz.netlify.app`. Set `APP_URL` to the Cloud Run service URL. Keep `ENABLE_CRON=false`.
3. In Netlify, open **Site configuration → Environment variables** and set the build-scoped variable `BACKEND_API_ORIGIN` to the Cloud Run origin only (for example `https://your-service-xyz.a.run.app`; no trailing path or `/api`).
4. Redeploy the Netlify site. `netlify.toml` builds the client and generates `/api/*`, `/healthz`, and `/readyz` proxy rules. The build intentionally fails if `BACKEND_API_ORIGIN` is missing or invalid.
5. Verify `https://hearthz.netlify.app/healthz` and `/readyz`. Then create a new circle to test registration and sign-in; no demo credentials are provided or automatically seeded.

`BACKEND_API_ORIGIN` is a public service origin, not a secret. Do not put Firebase credentials, JWT secrets, or service-account JSON in Netlify frontend variables. Set `JWT_SECRET`, `INTERNAL_SCHEDULER_SECRET`, and Firestore access on the backend through Google Cloud Secret Manager and the Cloud Run service identity. This repository does not use Firebase client-side authentication; sign-in is handled by the Express API.

## Development commands

```powershell
npm run dev
npm test
npm run lint
npm run build
```

The build type-checks and bundles the client, then compiles the server. Server tests use local in-memory storage and simulated integrations; they do not prove live Firestore, Gemini, SMTP, or emergency delivery.

## Production build and start

```powershell
npm run build
npm start
```

The production server serves `client/dist` and listens on `PORT`. Configure HTTPS at the hosting provider or load balancer, a restrictive `CLIENT_ORIGIN`, production-grade Firestore, and secrets through the provider's secret manager. Confirm both `/healthz` (process health) and `/readyz` (Firestore readiness) after deployment.

## Database, jobs, and deployment

Firestore is the intended production database. Use Firestore backups/export schedules and periodically test restoration into a separate project; no automated backup/restore procedure is configured by this repository. Do not run the seed script against production data.

See [deploy.md](./deploy.md) for the Cloud Run preparation notes. Cloud Run can scale to multiple instances, while the current in-process reminder cron has no distributed lock and can run more than once. Keep it disabled for multi-instance deployment and use a separately managed scheduler only after the endpoint, secret handling, retries, and duplicate prevention are operationally verified. A scheduler request being accepted is not proof an email was delivered.

## Current limitations

- Health records, vital-sign trends, robust emergency/SOS workflows, and a complete multilingual voice assistant are not implemented or verified in this source tree.
- AI fallback behavior is simulated for some non-scanning features. It must not be treated as clinical interpretation. No prescription details are generated when scanning is unavailable.
- Reminder processing still requires timezone, retry, duplicate-run, and recipient validation work. In-memory notifications and state are not durable.
- A production dependency audit currently reports **15 vulnerabilities** (11 moderate, 3 high, 1 critical); see the final launch-readiness report for the unresolved packages. Breaking upgrades have not been applied without compatibility testing.
- Automated checks pass for the currently present client and server test suites, but they do not cover all user roles, production Firestore isolation, email delivery, or real-world emergency workflows.

Do not use Hearth as a substitute for professional medical advice, medication verification, or emergency services.

# CareCircle
