# Prowider — Mini Lead Distribution

Setup (simple, complete)

Prerequisites

- Node.js 18+ (Node 20 recommended)
- A MongoDB that supports transactions (replica-set or Atlas)

Steps

1. Copy the example env and edit `MONGODB_URI`:

```bash
cp .env.example .env
# edit .env and set the MONGODB_URI value (Atlas or replica-set)
```

2. Install dependencies:

```bash
npm install
```

3. Seed the database (uses `MONGODB_URI` from `.env`):

```bash
# on Unix/macOS
MONGODB_URI="$(sed -E 's/^MONGODB_URI="?([^\"]*)"?$/\1/' .env)" npm run db:seed

# or explicitly:
# MONGODB_URI="mongodb://user:pass@host:27017/dbname" npm run db:seed
```

4. Run the app in development:

```bash
npm run dev
# open http://localhost:3000
```

5. Build and run production (optional):

```bash
npm run build
MONGODB_URI="..." npm run start
```

6. Run the integration scenario (app should be running at http://localhost:3000):

```bash
node test/integration-test.js
```

Notes

- The allocator uses MongoDB transactions — a replica-set-enabled MongoDB (or Atlas) is required for full behavior.
- The seed script creates services, providers, and distribution state.
- Use `/test-tools` in the app to simulate webhook resets and bulk lead creation.

Vercel deployment

- Add the `MONGODB_URI` environment variable in your Vercel project settings (do not commit credentials).
- Ensure the Vercel project uses Node.js 20 (the project sets `engines.node` to `20.x`).
- Deploy the repository to Vercel (import from GitHub). Vercel will run `npm run build` automatically.
- After deployment, confirm `/request-service`, `/dashboard`, and `/test-tools` work and that the `MONGODB_URI` points to a replica-set or Atlas instance (transactions required).


Allocation algorithm

- Each lead is assigned to exactly three providers.
- Mandatory providers for a service are chosen first.
- Remaining slots are filled from the service pool using a persisted round-robin cursor (`ServiceDistributionState.nextPoolIndex`).
- The allocator atomically reserves provider quota and records assignments.

Concurrency handling

- Allocation steps (lead insert, assignments, quota increments, cursor update) run inside a MongoDB transaction to avoid conflicting commits.
- Quota reservations use conditional atomic updates (`findOneAndUpdate` with `quotaUsed < monthlyQuota` and `$inc`) inside the transaction to prevent overbooking.
- A unique index on `(phone, serviceId)` prevents duplicate leads.

Webhook idempotency

- Each webhook `eventId` is recorded in a `WebhookEvent` collection with a unique index.
- If inserting the `eventId` fails because it already exists, the webhook is treated as already processed (no-op).
- New events reset provider quotas inside the same transaction, ensuring a single effective reset per unique `eventId`.
