# Stayora

Stayora is a full-stack vacation rental marketplace with a transparent, preference-based recommendation system and a reproducible research dashboard.

## Run & operate

- Use the configured `artifacts/stayora: web` and `artifacts/api-server: API Server` workflows together in Replit.
- `pnpm run typecheck` — typecheck workspace libraries and apps.
- `pnpm --filter @workspace/api-server test` — run recommendation, metric, and API route tests.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate Zod schemas and React Query hooks from the OpenAPI contract.
- `pnpm --filter @workspace/db run push` — sync the development database with Prisma.
- `pnpm --filter @workspace/db run seed` — idempotently seed the demo catalog and synthetic research profiles.

## Stack

- pnpm workspaces, TypeScript, React, Vite, Tailwind CSS, Wouter, TanStack Query, Lucide React, and Recharts.
- Express 5 API with Zod request/response validation and generated OpenAPI types.
- Replit PostgreSQL with Prisma.
- Clerk-managed authentication; application roles are stored and enforced by the API.
- Vitest for algorithm, metric, and API-route tests.

## Project map

- `artifacts/stayora` — responsive marketplace and account/host/admin screens.
- `artifacts/api-server` — Express application, route groups, authentication, recommendation service, and evaluation metrics.
- `lib/api-spec/openapi.yaml` — source-of-truth REST contract.
- `lib/api-zod` — generated server-side Zod schemas.
- `lib/api-client-react` — generated frontend hooks and request helpers.
- `lib/db/prisma/schema.prisma` — relational schema.
- `lib/db/prisma/seed.mjs` — demo properties, demo host, synthetic users, preferences, and sample reviews.
- `README.md` — setup, environment, API, demo-account, and limitation notes.

## Architecture decisions

- Clerk owns user credentials and browser sessions; Stayora stores the Clerk subject, verified email, profile, and role rather than passwords.
- Hosts and admins are authorized from the database role. `STAYORA_ADMIN_EMAIL` and `STAYORA_HOST_EMAIL` can bootstrap roles for matching verified Clerk accounts.
- The recommendation engine is deterministic and explainable; it does not call a paid AI API or claim to be machine learning.
- Booking prices are calculated on the server. Serializable transactions, overlap checks, and same-user retry handling protect booking creation.
- OpenAPI changes must be followed by API code generation so frontend hooks and server validation remain aligned.

## Gotchas

- The API and web workflows must both be running; the browser calls the API through `/api`.
- Set secrets through Replit Secrets, not source files. Never expose `CLERK_SECRET_KEY` or database credentials to Vite.
- `pnpm --filter @workspace/db run push` targets the development database. Review schema changes before applying them to any production database.
- Demo `.test` users are only research fixtures and do not have Clerk accounts or passwords.
- Bookings are demos only; no payment is collected. Property images are external HTTPS URLs; uploads are not implemented.
