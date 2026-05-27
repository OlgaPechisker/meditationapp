# Einat Shomonov Website

Professional website for Einat Shomonov – meditation, healing & wellness practitioner.

## Tech Stack

- **Frontend:** Angular 19 with SSR
- **Backend:** Node.js + Express 5 + Prisma ORM
- **Database:** PostgreSQL
- **i18n:** Transloco (Hebrew default, English ready)

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (or Docker)

### Database
```bash
docker-compose up -d
npx prisma migrate dev
npx prisma db seed
```

### Server
```bash
cd server
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npx ng serve
```

## Project Structure

```
├── client/          # Angular 19 SSR frontend
├── server/          # Express API backend
├── prisma/          # Database schema & migrations
├── docs/            # Design specs & plans
└── docker-compose.yml
```

## Admin Access

Navigate to `/admin/login` and enter the admin password (set via `ADMIN_PASSWORD` env var, default: `admin123`).
