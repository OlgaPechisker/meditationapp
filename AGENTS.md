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
| `STORAGE_PROVIDER` | `local` | `local` \| `s3` \| `azure` |
| `BASE_URL` | `http://localhost:3000` | Used to build public image URLs |

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

To convert legacy records, first review the dry-run report and back up its listed records, then apply it:

```bash
npm run migrate:rich-text --workspace=server
npm run migrate:rich-text --workspace=server -- --apply
```
