# Meme'd Campaign Payout Tracker

Brands run Instagram/YouTube campaigns with a **milestone ladder** (e.g. 10K views → ₹500, 50K → ₹2,000, 100K → ₹5,000). Creators submit posts, and as views come in they are paid the amount of the **highest milestone crossed**, never more than the campaign's budget.

- **Live app:** _add your Vercel URL here after deploying_
- **API:** _add your Render URL here after deploying_ (health check: `/api/health`)

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Running locally](#running-locally)
5. [Environment variables](#environment-variables)
6. [API reference](#api-reference)
7. [Data model](#data-model)
8. [Payout algorithm](#payout-algorithm)
9. [Budget concurrency strategy](#budget-concurrency-strategy)
10. [Assumptions and decisions](#assumptions-and-decisions)
11. [Tests](#tests)
12. [Deployment](#deployment)
13. [Limitations and next steps](#limitations-and-next-steps)
14. [Scaling to 10,000 creators](#scaling-to-10000-creators)

---

## Features

**Brands**
- Sign up / log in as a brand.
- Create a campaign: name, platform, total budget (₹), and a milestone ladder with a live preview. The ladder is validated on both client and server.
- Dashboard with total campaigns, budget allocated, paid out and remaining.
- Per-campaign budget spent vs. remaining, utilisation bar, Live / Budget exhausted status, and every submission with its views, earnings and payout status.

**Creators**
- Sign up / log in as a creator.
- Browse live campaigns (filter by platform, paginated), see the ladder and how much budget is left.
- Submit an Instagram or YouTube post link (validated and normalised per platform; duplicates rejected).
- Earnings page: total earned, a per-post breakdown, and anything "waiting on budget".

**Views and payouts**
- `PATCH /api/submissions/:id/views` simulates platform data. In the UI, every submission row has an **Update views** button that calls it.
- Payouts are incremental, idempotent and transactional; the budget can't be overspent even under concurrent updates.
- Bonus: posts whose views jump unusually fast are flagged ("View spike").

## Tech stack

| Layer | Choice |
| --- | --- |
| Backend | Node.js 22, TypeScript (strict), Express 5, Mongoose 8 / MongoDB, JWT (`jsonwebtoken`), `bcryptjs`, `zod` for input validation, `helmet`, `cors`, `express-rate-limit` |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, `lucide-react` icons, `sonner` toasts |
| Tests | Jest + ts-jest, Supertest, `mongodb-memory-server` (in-memory replica set) |
| Ops | Docker + Docker Compose, GitHub Actions CI, Render (API), Vercel (web), MongoDB Atlas |

## Architecture

```
Browser (Next.js, client components)
   │  fetch + "Authorization: Bearer <JWT>"
   ▼
Express API ── routes ─► middleware (auth, role) ─► controllers ─► services ─► Mongoose models ─► MongoDB (replica set)
                                       │                                  ▲
                                 zod validators                 pure payout rules (no I/O)
```

**The 30-second version for the interview:** routes only wire URLs to middleware and controllers. Controllers parse and validate input with zod and call a service. Services hold the business logic and talk to Mongoose. The money rules live in one pure file, `services/payout.ts`, with no database or HTTP, so they're unit-tested directly. The only place money moves is `services/viewsService.ts`: it runs in a MongoDB transaction and charges the campaign with a conditional `$inc` that only succeeds if the payout still fits in the budget. All errors go through one error handler that returns `{ error: { code, message, details? } }` and never leaks stack traces.

```
backend/
  src/
    app.ts                 Express app factory (no listen), used by server.ts and tests
    server.ts              connects to MongoDB, starts HTTP server, graceful shutdown
    config/                env validation (zod), db connection
    routes/                URL → middleware → controller wiring
    controllers/           HTTP in/out only: parse input, call service, send JSON
    services/
      payout.ts            PURE money rules: ladder validation, eligible payout, payout plan, statuses
      viewsService.ts      the transactional view update / payout
      campaignService.ts   create/list/get campaigns, brand dashboard, owner-only submissions
      submissionService.ts submit post, creator earnings
      authService.ts       signup/login/me
      spikeDetection.ts    bonus: view spike flag
    models/                User, Campaign, Submission schemas + indexes
    middleware/            requireAuth, requireRole, central error handler
    validators/            zod schemas for bodies, params, queries
    utils/                 AppError, JWT helpers, post URL normaliser, DTO serializers, formatting
  tests/                   Jest: payout rules, URL parsing, transactional payouts, API
  scripts/                 seed.ts (demo data), dev-db.ts (in-memory replica set)

frontend/src/
  app/                     routes: / , /login, /signup, (app)/dashboard, campaigns, campaigns/new, campaigns/[id], earnings
  components/              ui/ (Button, Field, Card, Badge, StatCard, States, …) and layout/ (AppShell, Logo)
  features/                auth (provider, guard), campaigns (form, ladder, tables, detail), submissions, dashboard
  hooks/useApiQuery.ts     load data with abort + stale-response protection and reload()
  lib/                     api client, token storage, INR/view formatting
  services/                typed endpoint functions
  types/api.ts             response types mirroring the API
```

One app shell serves both roles; navigation and page content switch on `user.role`. Route guards on the client only improve UX; **every permission is enforced by the API**.

## Running locally

Requires Node.js ≥ 20.19 (22 recommended).

### Option A: Docker (everything in one command)

```bash
docker compose up --build
# web: http://localhost:3000   api: http://localhost:4000
```

Compose starts MongoDB as a single-node replica set (needed for transactions), the API and the web app.

### Option B: run each app

```bash
# 1. Database (pick one)
cd backend && npm install && npm run db:dev     # in-memory replica set on :27017, no install needed (data is lost on exit)
#   or: docker compose up mongo                 # persistent; connect with ?directConnection=true from the host
#   or: a free MongoDB Atlas cluster            # put its connection string in MONGODB_URI

# 2. API (new terminal)
cd backend
cp .env.example .env            # set JWT_SECRET; MONGODB_URI default matches db:dev
npm run dev                     # http://localhost:4000
npm run seed                    # optional demo data (see below)

# 3. Web (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev                     # http://localhost:3000
```

Demo accounts created by `npm run seed`: `brand@demo.memed.in` and `creator@demo.memed.in`, password `demo1234`.

## Environment variables

| App | Variable | Required | Description |
| --- | --- | --- | --- |
| backend | `MONGODB_URI` | yes | MongoDB connection string. **Must be a replica set** (Atlas, `db:dev`, or Compose). |
| backend | `JWT_SECRET` | yes | ≥16 chars. Signs login tokens. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| backend | `JWT_EXPIRES_IN` | no | Token lifetime, default `7d`. |
| backend | `PORT` | no | Default `4000`. |
| backend | `CORS_ORIGIN` | no | Comma-separated allowed origins, default `http://localhost:3000`. Set to your Vercel URL in production. |
| backend | `NODE_ENV` | no | `development` / `production` / `test`. |
| frontend | `NEXT_PUBLIC_API_URL` | yes | API base URL without trailing slash. Baked in at build time. |

The API validates its env on startup and exits with a clear message if something is missing. See `.env.example`, `backend/.env.example`, `frontend/.env.example`.

## API reference

All responses are JSON. Success: `{ "data": ... }`. Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "milestones.0.views", "message": "..." }] } }`.
Authenticated routes need `Authorization: Bearer <token>`.

| Method | Path | Who | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Liveness check |
| POST | `/api/auth/signup` | public | `{ name, email, password, role: "brand" \| "creator" }` → `{ token, user }` (201). 409 `EMAIL_TAKEN` |
| POST | `/api/auth/login` | public | `{ email, password }` → `{ token, user }`. 401 `INVALID_CREDENTIALS` (same message for unknown email and wrong password) |
| GET | `/api/auth/me` | any user | Current user (used to restore the session) |
| POST | `/api/campaigns` | brand | `{ name, platform, totalBudget, milestones: [{ views, payout }] }` → campaign (201) |
| GET | `/api/campaigns` | any user | Browse. Query: `status=live\|exhausted\|all` (default `live`), `platform`, `page`, `limit` (≤50) → `{ items, page, limit, total, totalPages }` |
| GET | `/api/campaigns/mine` | brand | Own campaigns with `submissionCount` + dashboard `summary` |
| GET | `/api/campaigns/:id` | any user | One campaign (budget, spent, remaining, utilisation, ladder, status) |
| GET | `/api/campaigns/:id/submissions` | owning brand | Submissions for the campaign. 403 for other brands |
| POST | `/api/submissions` | creator | `{ campaignId, postUrl }` → submission (201). 400 `INVALID_POST_URL`, 409 `DUPLICATE_SUBMISSION`, 409 `CAMPAIGN_NOT_LIVE` |
| GET | `/api/submissions/mine` | creator | `{ submissions, summary: { totalEarned, submissionCount, blockedAmount } }` |
| PATCH | `/api/submissions/:id/views` | any logged-in user | `{ views }` → `{ submission, campaign, payout: { action: "paid"\|"none"\|"budget_blocked", amountPaid, blockedAmount, message } }` |

Status codes: 400 invalid input or id, 401 missing/invalid/expired token, 403 wrong role or not the owner, 404 not found, 409 conflicts, 413 body too large, 429 rate limited (auth routes), 500 unexpected (generic message only).

**Auth decision for the views endpoint:** the brief says it needs no role check, because it stands in for a platform webhook. I kept that (no role or ownership check) but still require a valid login so it isn't open to the whole internet. In production this would be a server-to-server call authenticated with an API key or HMAC signature, not a user endpoint.

## Data model

**User** `{ name, email (unique, lower-cased), passwordHash (select: false), role: brand|creator, timestamps }`

**Campaign** `{ name, platform: instagram|youtube, brand → User, totalBudget, spentAmount, milestones: [{ views, payout }] (sorted), status: live|exhausted, timestamps }`
- `remainingBudget` is **derived** (`totalBudget − spentAmount`) in the API response, never stored, so the two can't drift apart.
- Indexes: `{ brand, createdAt }` for "my campaigns", `{ status, platform, createdAt }` for browsing.

**Submission** `{ campaign → Campaign, creator → User, platform, postUrl (canonical), views, eligiblePayout, paidAmount, payoutStatus: pending|paid|budget_blocked, viewsUpdatedAt, flagged, timestamps }`
- `eligiblePayout` = what current views qualify for (can go down). `paidAmount` = money actually paid (only goes up).
- Indexes: unique `{ campaign, postUrl }` (one entry per post per campaign), `{ creator, createdAt }`, `{ campaign, createdAt }`.

All money is stored as **whole rupees (integers)**. Inputs that aren't safe integers are rejected, so there's no floating-point arithmetic on money anywhere.

## Payout algorithm

`services/payout.ts`:

1. **Ladder validation** (`validateMilestones`): 1–10 rungs, positive whole-number thresholds and payouts, no duplicate thresholds, sorted by views, and each higher threshold must pay strictly more. Unordered input is sorted, not rejected.
2. **Eligible payout** (`calculateEligiblePayout`): the payout of the highest milestone with `threshold ≤ views`, else ₹0. Amounts are **never summed**. Negative / fractional / non-finite views throw.
3. **Payout plan** (`planPayout`): `delta = eligible − alreadyPaid`.
   - `delta ≤ 0` → pay nothing (same milestone again, or views dropped).
   - `delta > remainingBudget` → `budget_blocked`, pay nothing.
   - otherwise → pay exactly `delta`.

Examples with the default ladder: 0 → ₹0, 9,999 → ₹0, 10,000 → ₹500, 49,999 → ₹500, 50,000 → ₹2,000, 150,000 → ₹5,000.
A post that goes 0 → 60K → 120K is paid ₹2,000 then ₹3,000, total ₹5,000.

## Budget concurrency strategy

Invariant: **`spentAmount ≤ totalBudget`, and `spentAmount` = sum of `paidAmount` over the campaign's submissions.**

`updateSubmissionViews` (in `services/viewsService.ts`) does everything inside one **MongoDB transaction** (`session.withTransaction`):

1. Read the submission and its campaign inside the transaction.
2. Compute the plan with the pure function above.
3. If paying, charge the campaign with a **conditional atomic update**:
   ```js
   Campaign.findOneAndUpdate(
     { _id, $expr: { $lte: [{ $add: ['$spentAmount', delta] }, '$totalBudget'] } },
     { $inc: { spentAmount: delta } },
   )
   ```
   If it matches nothing, the money isn't there and nothing is paid.
4. Save the submission (`views`, `eligiblePayout`, `paidAmount += delta`, status).
5. Update the campaign status if it became exhausted.

Why both a transaction and a conditional update:
- The **transaction** makes steps 3 and 4 all-or-nothing, so the campaign can never be charged for a payout the submission doesn't record (or vice versa), even if the process crashes or a write fails midway. A test injects a failure after the charge and checks that it's rolled back.
- Two concurrent transactions that write the same campaign or submission get a **write conflict**; MongoDB aborts one and `withTransaction` retries it from step 1 against fresh data. That's what stops two simultaneous updates from overspending, and the same update sent 8 times at once from paying 8 times (tests cover both).
- The **`$expr` guard** is a database-level backstop: even if the read in step 1 were stale, the write itself refuses to exceed the budget.

**Deployment requirement:** transactions need a replica set. MongoDB Atlas clusters (including the free M0 tier) are replica sets, and so are the Compose setup and `npm run db:dev`. A standalone `mongod` won't work; the API would return 500 on view updates. I chose this over a transaction-free design (conditional `$inc` + compensating refund) because a refund can itself fail and leave the books wrong, and explaining that recovery is harder than "both writes commit together or neither does".

## Assumptions and decisions

| Situation | Decision |
| --- | --- |
| Post crosses several milestones in one update | Paid the **highest** milestone once (e.g. 0 → 150K pays ₹5,000), never the sum. |
| Budget runs out mid-payout | **No partial payouts.** If the remaining budget can't cover the full increment, nothing is paid now; the submission is marked `budget_blocked` with the unfunded amount shown. Other posts whose (smaller) increments still fit are still paid. Partial payouts would leave a creator "between" milestones, which is confusing and hard to reconcile. |
| Views go down | Views and `eligiblePayout` are updated (shown as "Views dropped; payout kept") but **money already paid is never clawed back**. Going back up to an already-paid milestone pays nothing. |
| Repeated update with the same views | No-op for money (idempotent). |
| "Budget exhausted" | A campaign is `exhausted` once its remaining budget is below its **first** milestone payout, because a new creator could never be paid. It stops accepting new posts and leaves the browse list. Existing posts are still evaluated, and any increment that still fits is paid. |
| Minimum budget | Must be at least the first milestone payout, otherwise nobody could ever be paid. |
| Ladder rules | Strictly increasing payouts (a higher threshold paying the same or less is pointless), max 10 rungs, whole rupees. |
| Duplicate posts | A post (by canonical URL) can be in a campaign **once, by anyone**: stops two creators claiming the same video. `youtu.be/x`, `/shorts/x` and `watch?v=x&t=10` are the same post. The same post may be entered into different campaigns. |
| Post links | Must match the campaign's platform: Instagram `/p/`, `/reel/`, `/reels/`, `/tv/`; YouTube `watch?v=`, `youtu.be/`, `/shorts/`. |
| Views endpoint auth | Logged-in user required, no role/ownership check (per brief). See API section. |
| Tokens | JWT in `localStorage`, sent as a Bearer header. Simple across Vercel/Render domains (no third-party cookie issues). Trade-off: readable by XSS; an httpOnly cookie on a shared domain would be the production upgrade. |
| Roles | Chosen at signup and fixed. |
| View spike flag (bonus) | Flags a post gaining ≥100K views at >10K views/minute. Informational only; it doesn't block payouts. |
| Redis caching (bonus) | Not implemented. The browse query is a single indexed, paginated query, so a cache would add invalidation complexity (budgets change on every payout) for little gain at this size. |

## Tests

```bash
cd backend
npm test          # Jest: 89 tests in 4 suites
npm run typecheck
npm run build

cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

Integration tests start an **in-memory MongoDB replica set** with `mongodb-memory-server` (it downloads a MongoDB binary on first run; set `MONGOMS_SYSTEM_BINARY=/path/to/mongod` to use a local one). No external services needed.

| Suite | Covers |
| --- | --- |
| `payout.test.ts` | 0 views, below first milestone, exact thresholds, between thresholds, above top, never summing, unsorted ladders, invalid views (negative, fractional, NaN, ∞, unsafe), invalid ladders (empty, >10, duplicate thresholds, non-increasing payouts, zero/negative/fractional values), incremental plan, exact-budget edge, blocked plan, statuses, spike rule |
| `postUrl.test.ts` | URL normalisation for every supported format; wrong platform, lookalike hosts, `javascript:` and junk rejected |
| `viewsService.test.ts` | Payout within budget, increments, crossing several milestones, repeated identical updates, lower views, insufficient budget (no partial pay), other posts still paid, shared budget across posts, exhausted status, **2 and 12 simultaneous updates competing for the budget**, **the same update sent 8× at once**, **an injected write failure rolled back**, unknown submission. Every test checks `spent == Σ paid ≤ budget`. |
| `api.test.ts` | Signup/login/me, case-insensitive email, duplicate email, field-level validation errors, same error for wrong password vs unknown email, missing/forged/expired tokens, malformed JSON, campaign validation, client-supplied `spentAmount`/`status`/`brand` ignored, role checks, ownership (403), invalid id (400) vs unknown (404), pagination limits, duplicate post across URL formats, wrong platform, exhausted campaign, views endpoint validation, unknown routes, full brand → creator → views → earnings flow |

Verified results at submission time: backend `89 passed, 89 total`; backend typecheck and build pass; frontend lint, typecheck and production build pass. The full flow was also clicked through in a headless browser (desktop and phone widths) against both the local dev setup and the Docker Compose stack.

## Deployment

The free-tier setup: **MongoDB Atlas (M0) + Render (API) + Vercel (web)**.

1. **Atlas**: create a free M0 cluster, a database user, and allow network access from `0.0.0.0/0` (simplest for a demo; for production, allow only Render's published outbound IP ranges). Copy the `mongodb+srv://…` string and add a database name, e.g. `…mongodb.net/memed?retryWrites=true&w=majority`. M0 is a 3-node replica set, so transactions work.
2. **Render**: New → Blueprint → select this repo (uses `render.yaml`). Set `MONGODB_URI`, and `CORS_ORIGIN` to your Vercel URL (you can come back and set it after step 3). `JWT_SECRET` is generated for you. Check `https://<api>.onrender.com/api/health`. Optional: run `npm run seed` from the Render shell for demo data.
3. **Vercel**: Import the repo, set **Root Directory** to `frontend`, add `NEXT_PUBLIC_API_URL=https://<api>.onrender.com`, deploy.
4. Put the Vercel URL in Render's `CORS_ORIGIN` (redeploys automatically), then sign up as a brand, create a campaign, sign up as a creator in another browser, submit a post and update views.

Note: Render's free instances sleep when idle, so the first request after a while can take ~30–60 seconds.

## Limitations and next steps

- View counts are simulated; real ingestion would poll the Instagram/YouTube APIs or receive webhooks, via a queue (see below).
- No campaign editing, pausing, or budget top-ups; a top-up would also need to re-run blocked submissions.
- No payout ledger table. `paidAmount` is the running total; a production system should also write an append-only payout ledger for audit and reconciliation.
- JWT in `localStorage` (see above); no refresh tokens or password reset.
- Flagged spikes don't hold payouts; a real system would queue them for review.
- Lists other than browse aren't paginated (fine for one brand's campaigns; would need it at scale).

## Scaling to 10,000 creators

10,000 creators with a few posts each is ~50K submissions, which is small for MongoDB. The pressure comes from **view updates**, not from the number of users.

- **Ingest views asynchronously.** Instead of one HTTP call per update, a scheduler enqueues "refresh views" jobs (BullMQ/SQS) that workers process with rate limits per platform API. The payout transaction stays the same, so correctness doesn't depend on throughput.
- **Contention is per campaign.** Every payout for a campaign writes the same campaign document, so a viral campaign serialises its payouts and sees more transaction retries. If that becomes a bottleneck, process one campaign's payouts on a single queue partition (no conflicts), or split the budget into a few sub-buckets. Different campaigns don't contend at all.
- **Indexes and pagination** already match the main queries (`{status, platform, createdAt}`, `{creator, createdAt}`, `{campaign, createdAt}`). Next: cursor-based pagination instead of `skip`, and paginating brand submission lists.
- **Dashboard totals** are computed per request; at scale, maintain them incrementally in the payout transaction or with a read-model.
- **Caching:** the browse list could be cached (e.g. Redis, short TTL) since it is read-heavy, but budgets change on every payout, so the TTL must be short or the cache invalidated by the payout job. Never cache what decides money.
- **Observability and safety:** structured logs with request ids, metrics on payout latency, retries and blocked payouts, alerts on transaction failures, rate limiting per user on the API, and a nightly reconciliation job that checks `spentAmount == Σ paidAmount` for every campaign.
