# Stayora

**Find a place that feels like yours.** Stayora is a responsive vacation-rental marketplace with search, booking, host tools, role-protected administration, and a transparent rule-based recommendation engine.

## What is included

- Home, Explore, property detail, sign-in/sign-up, wishlist, bookings, preferences, profile, host, and admin routes.
- PostgreSQL-backed listings, preferences, reviews, wishlists, and bookings.
- Server-side availability, capacity, date, and price validation; repeated booking submissions are idempotent, and overlapping confirmed stays are rejected.
- Explainable recommendations with 30% destination, 25% budget, 20% amenities, 15% stay type, and 10% guest-capacity weights.
- An admin research dashboard comparing the personalized ranker with a rating/review-count baseline using seeded synthetic users.
- Demo properties across Indian destinations, with INR prices and external HTTPS image URLs.

## Run in Replit

Use the configured **Stayora web** and **API Server** workflows. They provide the correct Replit ports and preview paths and must run together.

For a fresh development database:

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed
```

Useful checks:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server test
```

When the OpenAPI contract changes, regenerate shared client/server code:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Environment and account setup

The Replit PostgreSQL integration supplies `DATABASE_URL`. Clerk is configured for authentication; keep its credentials in Replit Secrets:

- `CLERK_PUBLISHABLE_KEY` — API-side Clerk configuration.
- `CLERK_SECRET_KEY` — private API-side Clerk credential.
- `VITE_CLERK_PUBLISHABLE_KEY` — browser publishable key. This is public by design; never put a secret key in a `VITE_` variable.
- `VITE_CLERK_PROXY_URL` — optional frontend proxy URL when using a configured Clerk proxy.
- `STAYORA_ADMIN_EMAIL` — optional verified email to promote to administrator on sign-in.
- `STAYORA_HOST_EMAIL` — optional verified email to promote to host on sign-in.

Create a real demo account by signing up through Stayora with an email you control and completing Clerk verification. To make that account an administrator or initial host, set the matching role email in Replit Secrets before signing in. The API creates/updates the application profile from the verified Clerk identity. Any signed-in guest can also create a listing; the API promotes that account to host.

The seed script creates a demo host and synthetic `.test` users for the research evaluation. They are not Clerk accounts and have no passwords; do not use them to sign in.

## Project structure

```text
artifacts/
  stayora/       React/Vite marketplace
  api-server/    Express API
lib/
  api-spec/      OpenAPI source contract
  api-zod/       generated Zod schemas
  api-client-react/ generated hooks and fetch helper
  db/prisma/     Prisma schema and seed
```

## Database

The schema is in `lib/db/prisma/schema.prisma` and includes users, properties, bookings, reviews, wishlists, preferences, and evaluation runs, with foreign keys, uniqueness constraints, and query indexes. The development database has been synchronized with Prisma `db push` and seeded. A checked-in Prisma migration history has not been created; use the provided development sync command only for development. Review and plan a migration before applying schema changes to production.

Clerk handles passwords and session cookies. Stayora does not store password hashes or collect payment-card data.

## API

The complete contract is `lib/api-spec/openapi.yaml`; all endpoints are under `/api`.

| Area | Endpoints |
|---|---|
| Status and discovery | `GET /healthz`, `/home`, `/destinations`, `/properties`, `/properties/{propertyId}`, `/recommendations` |
| Reviews | `GET` and `POST /properties/{propertyId}/reviews` |
| Account | `GET` and `PATCH /me`; `GET` and `PUT /preferences` |
| Wishlist | `GET` and `POST /wishlist`; `DELETE /wishlist/{propertyId}` |
| Bookings | `GET` and `POST /bookings`; `POST /bookings/{bookingId}/cancel` |
| Hosting | `GET`/`POST /host/listings`; `PATCH`/`DELETE /host/listings/{propertyId}`; `GET /host/bookings` |
| Administration | `GET /admin/overview`, `/admin/properties`, `/admin/users`, `/admin/evaluations/latest`; `DELETE /admin/properties/{propertyId}`; `PATCH /admin/users/{userId}/role`; `POST /admin/evaluations/run` |

## Recommendation research

The relevance scale is: `0` = no preference dimensions matched, `1` = one matched, `2` = two or more matched among destination, budget, stay type, and amenities. Guest capacity is an eligibility filter. Precision@5 treats relevance `2` as relevant and divides by `min(5, eligible results)`. nDCG@5 uses gain `2^relevance - 1` and rank discount `log2(position + 1)`. The reported average is the ranker computation time per synthetic profile; it excludes database loading and network time. The evaluation stores the definitions alongside each result and clearly marks its data as synthetic.

Run the evaluation from the Admin dashboard. Seeded synthetic profiles and property records make the evaluation repeatable; results are measurements, not claims that the personalized method beats the baseline.

## Tests and verification

The API test suite covers recommendation scoring/ranking and explanations, budget/destination relevance behavior, guest capacity, Precision@5/nDCG@5, protected-route access, administrator authorization, host ownership, invalid booking dates, server-side booking capacity/pricing, retry behavior, and overlap rejection.

Run it with `pnpm --filter @workspace/api-server test`. Run workspace typechecking with `pnpm run typecheck`.

## Limitations

- Bookings use a demo payment status only; there is no payment processing.
- Images use external HTTPS URLs; user uploads are not implemented.
- Clerk-managed sign-up and sign-in require the configured Clerk environment and a verified email.
- The development database is initialized with `db push`; no production migration has been run.

To publish, configure production database and Clerk secrets in Replit, apply a reviewed production schema migration, then use Replit's Publish action.
