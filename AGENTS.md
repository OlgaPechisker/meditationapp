# Einat Shomonov Website — Server

REST API backend for the Einat Shomonov meditation, healing & wellness practitioner website.

> **Frontend (Angular):** [Einat-client](https://github.com/OlgaPechisker/meditationapp-client)

## Tech Stack

- **Runtime:** Node.js 24.15+ with npm 11.6.2
- **Framework:** Express 5
- **ORM:** Prisma
- **Database:** PostgreSQL 16
- **Auth:** JWT (single admin password)
- **File storage:** Local (dev) — S3/Azure ready

## Project Structure

```
├── server/          # Express API source
│   ├── src/         # Application code
│   ├── prisma/      # Database schema & migrations
│   └── tests/       # Unit / integration tests
├── e2e/             # Playwright end-to-end tests (API + UI)
├── docs/            # Deployment plans & design specs
└── docker-compose.yml  # Local PostgreSQL
```

## Quick Start

### Prerequisites
- Node.js 24.15+ with npm 11.6.2
- PostgreSQL 16 (or Docker)

The repository pins these versions in `.nvmrc`, `engines`, and `packageManager`. Use `npm ci` for reproducible installs.

### 1. Start the database
```bash
docker-compose up -d
```

### 2. Install & migrate
```bash
npm ci
npm run db:migrate
npm run db:seed
```

### 3. Run the dev server
```bash
npm run dev
# API available at http://localhost:3000
```

## Environment Variables

Copy the root `.env.example` to `.env` and adjust:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://einat:einat@localhost:5432/einat_dev` | Postgres connection string |
| `JWT_SECRET` | — | At least 32 random characters used to sign admin JWTs |
| `JWT_ISSUER` | — | Required JWT issuer (for example, `einat-api`) |
| `JWT_AUDIENCE` | — | Required JWT audience (for example, `einat-admin`) |
| `ADMIN_PASSWORD_HASH` | — | Bcrypt hash; required in production |
| `ADMIN_PASSWORD` | `admin123` | Development-only admin login password |
| `PORT` | `3000` | HTTP port |
| `ALLOWED_ORIGINS` | — | Required in production; comma-separated absolute browser origins |
| `HTTPS_TERMINATION` | `false` | Set `true` only when production HTTPS is guaranteed by trusted infrastructure |
| `RATE_LIMIT_MAX_BUCKETS` | `10000` | Maximum active in-memory rate-limit buckets |
| `STORAGE_PROVIDER` | `local` | `local` \| `s3` \| `azure` |
| `MAX_FILE_SIZE_MB` | `5` | Whole-number image-upload limit in MB; range `1`–`25` |
| `BASE_URL` | `http://localhost:3000` | Used to build public image URLs |

`ALLOWED_ORIGINS` is a comma-separated allowlist for browser CORS requests.
Entries must be absolute `http` or `https` origins without credentials, paths,
queries, or fragments; trailing slashes are normalized away. It is required in
production. The API allows requests without an `Origin` header for non-browser
clients and does not enable credentialed CORS.

Set `HTTPS_TERMINATION=true` only when `NODE_ENV=production` and trusted
infrastructure terminates HTTPS for every public request. This is the only
configuration that enables HSTS; leave it `false` for local development or any
deployment that can receive public HTTP.

Keep secrets out of source control, deployment logs, and shared examples. Generate
`JWT_SECRET` with a cryptographically secure generator and use a distinct value in
every environment. Production requires `ADMIN_PASSWORD_HASH` and rejects
`ADMIN_PASSWORD`, including known development passwords. Generate a bcrypt hash with:

```powershell
# Run from the repository root; this uses server/node_modules, not npm exec.
Set-Location server
node -e "import bcrypt from 'bcrypt'; console.log(await bcrypt.hash(process.argv[1], 12))" "replace-with-a-strong-password"
```

Admin JWTs use HS256, the configured issuer and audience, and expire exactly two
hours after signing. There is no token revocation store. To invalidate every active
token during an emergency, replace `JWT_SECRET` with a new secure value and restart
all application instances; every existing bearer token is immediately invalid, and
newly issued tokens remain valid for at most two hours.

## Rate limiting deployment

Rate-limit buckets are in-memory and apply only within one application instance.
Before horizontally scaling the API, replace the in-memory limiter store with a
shared external store so limits remain consistent across instances.

## Image upload deployment

The API accepts only structurally valid, magic-byte-verified JPEG, PNG, WebP, and
GIF uploads. Client file names and declared MIME types are untrusted; the declared
type must match the inspected image bytes. URLs use a server-generated UUID and
the inspected extension.

For production, expose `/uploads` through a dedicated cookieless **same-site**
asset hostname (for example, `https://assets.example.com`) and set `BASE_URL` to
that origin. The reverse proxy must route that path to the application or approved
asset storage without attaching application cookies. Do not set authentication
cookies with a parent-domain `Domain` attribute that includes the asset hostname.
Upload responses use `Cross-Origin-Resource-Policy: same-site`, so the frontend
and asset hostname must share the same scheme and registrable domain.

## E2E Tests

End-to-end tests live in `e2e/` and cover both the API and the Angular UI.
They require **both** the server and the [frontend](https://github.com/OlgaPechisker/meditationapp-client) to be running.

```bash
# Copy and fill in e2e environment
cp .env.test.example e2e/.env

# Install Playwright
npm run e2e:install

# Run tests
npm run e2e
```

## CI and dependency policy

GitHub Actions runs the database migration, seed, build, tests, API startup smoke test, and `npm audit --omit=dev --audit-level=high` on every pull request. Production critical and high audit findings block CI; development-only findings are reviewed separately.

Set `TEST_DATABASE_URL` when running the API suite against an isolated database; it takes precedence over a local `.env` database URL.

## Admin Access

Navigate to `/admin/login` in the frontend and enter the administrator password.
Use `ADMIN_PASSWORD_HASH` in production; `ADMIN_PASSWORD` is available only for
development.

## Rich content

Blog bodies, the `about` content entry, treatment descriptions, and lecture descriptions are stored as sanitized semantic HTML. Supported formatting is paragraphs, `h2`/`h3`, bold, italic, ordered and unordered lists, safe HTTP(S)/mailto links, and the `ql-align-{right,center,left}` and `ql-direction-{rtl,ltr}` classes. Unsupported pasted markup, inline styles, embeds, and unsafe URLs are removed.

All other authored strings are bounded plain text, except image and video fields,
which use their respective validated URL contracts. `SiteContent` accepts only
these keys: `about` (sanitized semantic HTML), `about_title`, `contact_phone`,
and `contact_email` (bounded plain text), and `about_image` (validated asset
URL). Unknown keys are rejected.

Comments are plain text, not HTML. The API trims comment names and bodies,
rejects inappropriate control characters, and stores literal angle brackets as
text without sanitizing or interpreting them. The Angular frontend must render
comments and bounded plain-text `SiteContent` values (`about_title`,
`contact_phone`, and `contact_email`) with interpolation or `textContent`,
never `[innerHTML]`.

To convert legacy records, first review the dry-run report and back up its listed records, then apply it:

```bash
npm run migrate:rich-text --workspace=server
npm run migrate:rich-text --workspace=server -- --apply
```

## Test suites

Backend tests are split into two Vitest projects under `server/tests/`:

- `unit/` — pure logic/validation tests with no database dependency. Run with
  `npm run test:unit --workspace=server`.
- `integration/` — Supertest-driven tests that exercise the real Express app and Postgres
  via Prisma. Run with `npm run test:integration --workspace=server`.

`npm run test --workspace=server` runs both projects. CI runs them as separate steps.

## Cross-repository E2E CI

In addition to unit/integration tests, CI runs a dependent `e2e` job on pull requests and
pushes to `main`. It boots PostgreSQL and the backend from the current branch, checks out
the frontend repository's (`Einat-client`) `main` branch, builds it with the `e2e` Angular
configuration and serves its SSR application, waits for both services to become healthy,
then runs the root Playwright suite (`e2e/`) against them. The Playwright HTML report is
uploaded as a build artifact if the suite fails.

The `e2e` build configuration (`npm run build:e2e` in `Einat-client`) is production-like
(same optimizations/budgets) but keeps `apiUrl` pointed at `http://localhost:3000/api`
instead of the hardcoded production Railway URL baked into `environment.prod.ts` by the
default `production` configuration — using a plain `npm run build` here would make the CI
frontend call the live production API instead of the freshly seeded local backend.

To reproduce this locally, start PostgreSQL and prepare the backend in one terminal:

```bash
docker-compose up -d
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm run start
```

Build and serve the sibling frontend repository in a second terminal (any convenient
checkout of `Einat-client` works):

```bash
cd ../Einat-client
npm ci
npm run build:e2e
PORT=4000 npm run serve:ssr:client
```

Then run the backend E2E suite with both service URLs:

```bash
APP_URL=http://localhost:4000 API_URL=http://localhost:3000 npm run e2e
```
