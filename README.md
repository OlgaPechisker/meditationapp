# Einat Shomonov Website — Server

REST API backend for the Einat Shomonov meditation, healing & wellness practitioner website.

> **Frontend (Angular):** [Einat-client](https://github.com/OlgaPechisker/meditationapp-client)

## Tech Stack

- **Runtime:** Node.js 20+
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
- Node.js 20+
- PostgreSQL 16 (or Docker)

### 1. Start the database
```bash
docker-compose up -d
```

### 2. Install & migrate
```bash
cd server
npm install
npx prisma migrate dev
npx prisma db seed
```

### 3. Run the dev server
```bash
npm run dev
# API available at http://localhost:3000
```

## Environment Variables

Copy `.env.example` to `.env` inside `server/` and adjust:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://einat:einat@localhost:5432/einat_dev` | Postgres connection string |
| `JWT_SECRET` | — | Secret for signing admin JWTs |
| `ADMIN_PASSWORD` | `admin123` | Admin login password |
| `PORT` | `3000` | HTTP port |
| `STORAGE_PROVIDER` | `local` | `local` \| `s3` \| `azure` |
| `BASE_URL` | `http://localhost:3000` | Used to build public image URLs |

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

## Admin Access

Navigate to `/admin/login` in the frontend and enter the admin password (set via `ADMIN_PASSWORD`, default: `admin123`, or provide `ADMIN_PASSWORD_HASH`).
