# Einat Shomonov Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Hebrew RTL website for a meditation/healing practitioner with treatments, blog, lectures, songs, and admin panel.

**Architecture:** Angular 19 SSR monorepo with Express/Prisma backend. Transloco for i18n, locale-per-record for dynamic content. JWT admin auth, WhatsApp deep links for contact.

**Tech Stack:** Angular 19, Express 5, Prisma ORM, PostgreSQL, Transloco, SCSS with CSS logical properties

---

## File Structure

```
einat/
├── package.json                    # Root workspace config
├── docker-compose.yml              # PostgreSQL for dev
├── .env.example                    # Environment variables template
├── prisma/
│   ├── schema.prisma               # Database schema (all models)
│   └── seed.ts                     # Seed script for dev data
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                # Express app entry
│   │   ├── config.ts               # Env config loader
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT verification
│   │   │   ├── locale.ts           # Locale extraction from query/header
│   │   │   ├── rate-limit.ts       # IP-based rate limiting
│   │   │   └── error-handler.ts    # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.routes.ts      # POST /api/auth/login
│   │   │   ├── treatments.routes.ts
│   │   │   ├── blog.routes.ts
│   │   │   ├── comments.routes.ts
│   │   │   ├── lectures.routes.ts
│   │   │   ├── songs.routes.ts
│   │   │   └── content.routes.ts   # Site content (about, etc.)
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── treatments.service.ts
│   │   │   ├── blog.service.ts
│   │   │   ├── comments.service.ts
│   │   │   ├── lectures.service.ts
│   │   │   ├── songs.service.ts
│   │   │   └── content.service.ts
│   │   └── utils/
│   │       ├── pagination.ts       # Pagination helper
│   │       └── slugify.ts          # Hebrew-safe slug generation
│   └── tests/
│       ├── setup.ts                # Test DB setup/teardown
│       ├── auth.test.ts
│       ├── treatments.test.ts
│       ├── blog.test.ts
│       ├── comments.test.ts
│       ├── lectures.test.ts
│       ├── songs.test.ts
│       └── content.test.ts
├── client/
│   ├── package.json
│   ├── angular.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.spec.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── main.server.ts
│   │   ├── app/
│   │   │   ├── app.component.ts
│   │   │   ├── app.component.html
│   │   │   ├── app.component.scss
│   │   │   ├── app.routes.ts
│   │   │   ├── app.config.ts
│   │   │   ├── app.config.server.ts
│   │   │   ├── core/
│   │   │   │   ├── services/
│   │   │   │   │   ├── api.service.ts          # HTTP client wrapper
│   │   │   │   │   ├── auth.service.ts         # Admin auth state
│   │   │   │   │   ├── seo.service.ts          # Meta tags
│   │   │   │   │   └── whatsapp.service.ts     # wa.me link builder
│   │   │   │   ├── guards/
│   │   │   │   │   └── auth.guard.ts           # Admin route guard
│   │   │   │   └── interceptors/
│   │   │   │       ├── auth.interceptor.ts     # JWT header
│   │   │   │       └── locale.interceptor.ts   # Locale query param
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   │   ├── header/                 # Site header + nav
│   │   │   │   │   ├── footer/                 # Site footer
│   │   │   │   │   ├── card/                   # Reusable card
│   │   │   │   │   ├── pagination/             # Pagination controls
│   │   │   │   │   └── loading/                # Loading spinner
│   │   │   │   └── pipes/
│   │   │   │       └── safe-html.pipe.ts       # Sanitized HTML
│   │   │   ├── pages/
│   │   │   │   ├── home/
│   │   │   │   │   ├── home.component.ts
│   │   │   │   │   ├── home.component.html
│   │   │   │   │   └── home.component.scss
│   │   │   │   ├── treatments/
│   │   │   │   │   ├── treatment-list.component.ts   # /treatments
│   │   │   │   │   └── treatment-detail.component.ts # /treatments/:slug
│   │   │   │   ├── blog/
│   │   │   │   │   ├── blog-list.component.ts
│   │   │   │   │   └── blog-post.component.ts
│   │   │   │   ├── lectures/
│   │   │   │   │   └── lectures.component.ts
│   │   │   │   ├── songs/
│   │   │   │   │   └── songs.component.ts
│   │   │   │   ├── about/
│   │   │   │   │   └── about.component.ts
│   │   │   │   ├── contact/
│   │   │   │   │   └── contact.component.ts
│   │   │   │   └── not-found/
│   │   │   │       └── not-found.component.ts
│   │   │   └── admin/
│   │   │       ├── admin.routes.ts
│   │   │       ├── admin-layout.component.ts
│   │   │       ├── login/
│   │   │       │   └── login.component.ts
│   │   │       ├── treatments/
│   │   │       │   └── treatment-editor.component.ts
│   │   │       ├── blog/
│   │   │       │   └── post-editor.component.ts
│   │   │       ├── comments/
│   │   │       │   └── comment-moderation.component.ts
│   │   │       ├── lectures/
│   │   │       │   └── lecture-editor.component.ts
│   │   │       ├── songs/
│   │   │       │   └── song-editor.component.ts
│   │   │       └── content/
│   │   │           └── content-editor.component.ts
│   │   ├── assets/
│   │   │   ├── i18n/
│   │   │   │   ├── he.json          # Hebrew UI translations
│   │   │   │   └── en.json          # English UI translations
│   │   │   └── images/
│   │   │       └── logo.svg
│   │   └── styles/
│   │       ├── _variables.scss       # Colors, spacing, breakpoints
│   │       ├── _typography.scss      # Heebo font, text scales
│   │       ├── _mixins.scss          # RTL helpers, responsive
│   │       └── styles.scss           # Global styles
│   └── tests/
│       └── (Angular CLI default test setup)
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-05-27-einat-website-design.md
        └── plans/
            └── 2026-05-27-einat-website.md (this file)
```

---

## Phase 1: Project Scaffolding

### Task 1.1: Root Workspace Setup

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "einat-website",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm start",
    "db:migrate": "npx prisma migrate dev",
    "db:seed": "npx prisma db seed",
    "db:studio": "npx prisma studio"
  },
  "engines": { "node": ">=20.0.0" }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.env
*.log
.angular/
coverage/
```

- [ ] **Step 3: Create .env.example**

```env
DATABASE_URL=postgresql://einat:einat@localhost:5432/einat_dev
JWT_SECRET=change-me-in-production
ADMIN_PASSWORD_HASH=$2b$10$placeholder
PORT=3000
```

- [ ] **Step 4: Create docker-compose.yml**

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: einat
      POSTGRES_PASSWORD: einat
      POSTGRES_DB: einat_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 5: Start PostgreSQL and verify**

Run: `docker-compose up -d && docker-compose ps`
Expected: db service running, port 5432 mapped

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: initialize workspace with docker-compose"
```

---

### Task 1.2: Server Package Setup

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "einat-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "express": "^5.0.0",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "prisma": "^6.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Install server dependencies**

Run: `cd server && npm install`
Expected: node_modules created, no errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add server package with Express and Prisma deps"
```

---

### Task 1.3: Angular Client Scaffold

**Files:**
- Create: `client/` (via Angular CLI)

- [ ] **Step 1: Generate Angular project with SSR**

Run (from project root):
```bash
npx @angular/cli@19 new client --directory client --routing --style scss --ssr --skip-git --skip-tests=false
```
Expected: Angular 19 project created in `client/` with SSR support

- [ ] **Step 2: Install Transloco**

Run:
```bash
cd client && npx ng add @jsverse/transloco --skip-confirmation
```
Expected: Transloco module added, `src/assets/i18n/en.json` created

- [ ] **Step 3: Verify Angular serves**

Run: `cd client && npx ng serve --open=false`
Expected: Compiles successfully, serves on http://localhost:4200

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Angular 19 client with SSR and Transloco"
```

---

## Phase 2: Database Schema & Migrations

### Task 2.1: Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Create Prisma schema with all models**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Treatment {
  id          Int       @id @default(autoincrement())
  slug        String
  locale      String    @default("he")
  title       String
  subtitle    String?
  description String
  price       String?
  imageUrl    String?
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([slug, locale])
}

model BlogPost {
  id          Int       @id @default(autoincrement())
  slug        String
  locale      String    @default("he")
  title       String
  excerpt     String?
  content     String
  imageUrl    String?
  publishedAt DateTime?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  comments    Comment[]

  @@unique([slug, locale])
}

model Comment {
  id         Int       @id @default(autoincrement())
  postId     Int
  post       BlogPost  @relation(fields: [postId], references: [id])
  authorName String
  content    String
  isApproved Boolean   @default(false)
  createdAt  DateTime  @default(now())

  @@index([postId, isApproved])
}

model Lecture {
  id          Int       @id @default(autoincrement())
  slug        String
  locale      String    @default("he")
  title       String
  description String
  date        DateTime
  location    String?
  price       String?
  imageUrl    String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([slug, locale])
}

model Song {
  id        Int      @id @default(autoincrement())
  locale    String   @default("he")
  title     String
  lyrics    String
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([title, locale])
}

model SiteContent {
  id        Int      @id @default(autoincrement())
  key       String
  locale    String   @default("he")
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([key, locale])
}
```

- [ ] **Step 2: Create .env file from example**

Run: `cp .env.example .env`
(Ensure DATABASE_URL matches docker-compose)

- [ ] **Step 3: Run initial migration**

Run: `npx prisma migrate dev --name init`
Expected: Migration created in `prisma/migrations/`, database tables created

- [ ] **Step 4: Generate Prisma client**

Run: `npx prisma generate`
Expected: Client generated in node_modules/@prisma/client

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema with all models and initial migration"
```

---

### Task 2.2: Seed Script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma seed config)

- [ ] **Step 1: Create seed script**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Treatments
  await prisma.treatment.createMany({
    data: [
      {
        slug: "healing",
        locale: "he",
        title: "ריפוי",
        subtitle: "טיפול אנרגטי",
        description: "טיפול ריפוי אנרגטי שמשלב טכניקות עתיקות עם גישה מודרנית.",
        price: "₪350",
        sortOrder: 1,
      },
      {
        slug: "meditation",
        locale: "he",
        title: "מדיטציה",
        subtitle: "מדיטציה מודרכת",
        description: "מפגשי מדיטציה מודרכת לשלווה פנימית והתחדשות.",
        price: "₪250",
        sortOrder: 2,
      },
    ],
  });

  // Blog posts
  await prisma.blogPost.create({
    data: {
      slug: "welcome",
      locale: "he",
      title: "ברוכים הבאים",
      excerpt: "פוסט ראשון בבלוג",
      content: "שמחה לבשר על השקת האתר החדש! כאן תמצאו מידע על טיפולים, הרצאות ועוד.",
      publishedAt: new Date(),
    },
  });

  // Lectures
  await prisma.lecture.create({
    data: {
      slug: "intro-meditation",
      locale: "he",
      title: "מבוא למדיטציה",
      description: "הרצאה פתוחה על יסודות המדיטציה וטכניקות לתחילת הדרך.",
      date: new Date("2026-07-01T19:00:00"),
      location: "תל אביב",
      price: "₪80",
    },
  });

  // Songs
  await prisma.song.create({
    data: {
      locale: "he",
      title: "שיר לנשמה",
      lyrics: "מילים זורמות כמו מים\nנושאות אותי למקומות גבוהים\nהנשמה שרה את שירה\nואני מקשיבה.",
      sortOrder: 1,
    },
  });

  // Site content
  await prisma.siteContent.createMany({
    data: [
      {
        key: "about",
        locale: "he",
        value: "עינת שומונוב - מטפלת ומדריכת מדיטציה. מלווה אנשים בדרכם לריפוי ושלווה פנימית.",
      },
      {
        key: "contact_phone",
        locale: "he",
        value: "+972501234567",
      },
      {
        key: "contact_email",
        locale: "he",
        value: "einat@example.com",
      },
    ],
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Add seed config to root package.json**

Add to `package.json`:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Run seed**

Run: `npx prisma db seed`
Expected: "Seed complete" printed, data in database

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add seed script with sample data"
```

---

## Phase 3: Backend Core

### Task 3.1: Config and Express Setup

**Files:**
- Create: `server/src/config.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create config.ts**

```typescript
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(10),
  ADMIN_PASSWORD_HASH: z.string(),
  PORT: z.coerce.number().default(3000),
});

export const config = envSchema.parse(process.env);
```

- [ ] **Step 2: Create index.ts (Express app entry)**

```typescript
import "dotenv/config";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { localeMiddleware } from "./middleware/locale.js";
import { authRoutes } from "./routes/auth.routes.js";
import { treatmentRoutes } from "./routes/treatments.routes.js";
import { blogRoutes } from "./routes/blog.routes.js";
import { commentRoutes } from "./routes/comments.routes.js";
import { lectureRoutes } from "./routes/lectures.routes.js";
import { songRoutes } from "./routes/songs.routes.js";
import { contentRoutes } from "./routes/content.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(localeMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/lectures", lectureRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/content", contentRoutes);

app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

export { app };
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Express app entry and config"
```

---

### Task 3.2: Middleware

**Files:**
- Create: `server/src/middleware/locale.ts`
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/rate-limit.ts`
- Create: `server/src/middleware/error-handler.ts`

- [ ] **Step 1: Create locale middleware**

```typescript
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      locale: string;
    }
  }
}

export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  const locale = (req.query.locale as string) || req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "he";
  req.locale = ["he", "en"].includes(locale) ? locale : "he";
  next();
}
```

- [ ] **Step 2: Create auth middleware**

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const token = header.slice(7);
    jwt.verify(token, config.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
```

- [ ] **Step 3: Create rate-limit middleware**

```typescript
import { Request, Response, NextFunction } from "express";

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    entry.count++;
    next();
  };
}
```

- [ ] **Step 4: Create error handler**

```typescript
import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add middleware (locale, auth, rate-limit, error-handler)"
```

---

### Task 3.3: Utility Functions

**Files:**
- Create: `server/src/utils/pagination.ts`
- Create: `server/src/utils/slugify.ts`

- [ ] **Step 1: Create pagination helper**

```typescript
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export function paginate(params: PaginationParams) {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}

export function paginatedResponse<T>(data: T[], total: number, params: PaginationParams) {
  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
    },
  };
}
```

- [ ] **Step 2: Create slugify helper**

```typescript
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u0590-\u05FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
```

- [ ] **Step 3: Write tests for utilities**

Create `server/tests/utils.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { slugify } from "../src/utils/slugify.js";
import { paginate, paginatedResponse } from "../src/utils/pagination.js";

describe("slugify", () => {
  it("converts English text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("preserves Hebrew characters", () => {
    expect(slugify("שלום עולם")).toBe("שלום-עולם");
  });

  it("removes special characters", () => {
    expect(slugify("test! @#$% string")).toBe("test-string");
  });
});

describe("paginate", () => {
  it("calculates skip and take for page 1", () => {
    expect(paginate({ page: 1, limit: 20 })).toEqual({ skip: 0, take: 20 });
  });

  it("calculates skip and take for page 3", () => {
    expect(paginate({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
  });
});

describe("paginatedResponse", () => {
  it("wraps data with meta", () => {
    const result = paginatedResponse(["a", "b"], 50, { page: 2, limit: 10 });
    expect(result).toEqual({
      data: ["a", "b"],
      meta: { page: 2, limit: 10, total: 50 },
    });
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run tests/utils.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pagination and slugify utilities with tests"
```

---

## Phase 4: Backend CRUD Routes

### Task 4.1: Auth Routes

**Files:**
- Create: `server/src/routes/auth.routes.ts`
- Create: `server/src/services/auth.service.ts`
- Create: `server/tests/auth.test.ts`

- [ ] **Step 1: Create auth service**

```typescript
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

export async function login(password: string): Promise<string | null> {
  const valid = await bcrypt.compare(password, config.ADMIN_PASSWORD_HASH);
  if (!valid) return null;
  return jwt.sign({ role: "admin" }, config.JWT_SECRET, { expiresIn: "24h" });
}
```

- [ ] **Step 2: Create auth routes**

```typescript
import { Router, Request, Response } from "express";
import { z } from "zod";
import { login } from "../services/auth.service.js";

export const authRoutes = Router();

const loginSchema = z.object({
  password: z.string().min(1),
});

authRoutes.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Password required" });
    return;
  }

  const token = await login(parsed.data.password);
  if (!token) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  res.json({ token });
});
```

- [ ] **Step 3: Write auth test**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../src/index.js";

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("test-password", 10);
  });

  it("returns token with correct password", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "test-password" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("returns 401 with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 400 without password", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 4: Run auth tests**

Run: `cd server && npx vitest run tests/auth.test.ts`
Expected: All 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add auth route with login endpoint"
```

---

### Task 4.2: Treatments CRUD

**Files:**
- Create: `server/src/services/treatments.service.ts`
- Create: `server/src/routes/treatments.routes.ts`
- Create: `server/tests/treatments.test.ts`

- [ ] **Step 1: Create treatments service**

```typescript
import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listTreatments(locale: string, pagination: PaginationParams) {
  const where = { locale, isActive: true };
  const [data, total] = await Promise.all([
    prisma.treatment.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      ...paginate(pagination),
    }),
    prisma.treatment.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function getTreatmentBySlug(slug: string, locale: string) {
  return prisma.treatment.findUnique({ where: { slug_locale: { slug, locale } } });
}

export async function createTreatment(data: {
  slug: string;
  locale: string;
  title: string;
  subtitle?: string;
  description: string;
  price?: string;
  imageUrl?: string;
  sortOrder?: number;
}) {
  return prisma.treatment.create({ data });
}

export async function updateTreatment(id: number, data: Partial<{
  title: string;
  subtitle: string;
  description: string;
  price: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}>) {
  return prisma.treatment.update({ where: { id }, data });
}

export async function listAllTreatments(locale: string, pagination: PaginationParams) {
  const where = { locale };
  const [data, total] = await Promise.all([
    prisma.treatment.findMany({ where, orderBy: { sortOrder: "asc" }, ...paginate(pagination) }),
    prisma.treatment.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}
```

- [ ] **Step 2: Create treatments routes**

```typescript
import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as treatmentService from "../services/treatments.service.js";

export const treatmentRoutes = Router();

// Public
treatmentRoutes.get("/", async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await treatmentService.listTreatments(req.locale, pagination);
  res.json(result);
});

treatmentRoutes.get("/:slug", async (req: Request, res: Response) => {
  const treatment = await treatmentService.getTreatmentBySlug(req.params.slug, req.locale);
  if (!treatment) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(treatment);
});

// Admin
const createSchema = z.object({
  slug: z.string().min(1),
  locale: z.string().default("he"),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().min(1),
  price: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});

treatmentRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const treatment = await treatmentService.createTreatment(parsed.data);
  res.status(201).json(treatment);
});

treatmentRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const treatment = await treatmentService.updateTreatment(id, req.body);
  res.json(treatment);
});

treatmentRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await treatmentService.listAllTreatments(req.locale, pagination);
  res.json(result);
});
```

- [ ] **Step 3: Write treatments test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { app } from "../src/index.js";

const prisma = new PrismaClient();

describe("Treatments API", () => {
  beforeAll(async () => {
    await prisma.treatment.create({
      data: { slug: "test-healing", locale: "he", title: "ריפוי", description: "תיאור", sortOrder: 1 },
    });
  });

  afterAll(async () => {
    await prisma.treatment.deleteMany({ where: { slug: "test-healing" } });
    await prisma.$disconnect();
  });

  it("GET / returns treatments for locale", async () => {
    const res = await request(app).get("/api/treatments?locale=he");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toHaveProperty("total");
  });

  it("GET /:slug returns single treatment", async () => {
    const res = await request(app).get("/api/treatments/test-healing?locale=he");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("ריפוי");
  });

  it("GET /:slug returns 404 for missing", async () => {
    const res = await request(app).get("/api/treatments/nonexistent?locale=he");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 4: Run treatments tests**

Run: `cd server && npx vitest run tests/treatments.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add treatments CRUD routes and service"
```

---

### Task 4.3: Blog CRUD

**Files:**
- Create: `server/src/services/blog.service.ts`
- Create: `server/src/routes/blog.routes.ts`
- Create: `server/tests/blog.test.ts`

- [ ] **Step 1: Create blog service**

```typescript
import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listPublishedPosts(locale: string, pagination: PaginationParams) {
  const where = { locale, publishedAt: { not: null }, deletedAt: null };
  const [data, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      select: { id: true, slug: true, title: true, excerpt: true, imageUrl: true, publishedAt: true },
      ...paginate(pagination),
    }),
    prisma.blogPost.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function getPostBySlug(slug: string, locale: string) {
  return prisma.blogPost.findFirst({
    where: { slug, locale, publishedAt: { not: null }, deletedAt: null },
  });
}

export async function createPost(data: {
  slug: string;
  locale: string;
  title: string;
  excerpt?: string;
  content: string;
  imageUrl?: string;
  publishedAt?: Date;
}) {
  return prisma.blogPost.create({ data });
}

export async function updatePost(id: number, data: Partial<{
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  publishedAt: Date | null;
}>) {
  return prisma.blogPost.update({ where: { id }, data });
}

export async function softDeletePost(id: number) {
  return prisma.blogPost.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function listAllPosts(locale: string, pagination: PaginationParams) {
  const where = { locale, deletedAt: null };
  const [data, total] = await Promise.all([
    prisma.blogPost.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(pagination) }),
    prisma.blogPost.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}
```

- [ ] **Step 2: Create blog routes**

```typescript
import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as blogService from "../services/blog.service.js";

export const blogRoutes = Router();

blogRoutes.get("/", async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await blogService.listPublishedPosts(req.locale, pagination);
  res.json(result);
});

blogRoutes.get("/:slug", async (req: Request, res: Response) => {
  const post = await blogService.getPostBySlug(req.params.slug, req.locale);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(post);
});

const createPostSchema = z.object({
  slug: z.string().min(1),
  locale: z.string().default("he"),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  imageUrl: z.string().url().optional(),
  publishedAt: z.coerce.date().optional(),
});

blogRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const post = await blogService.createPost(parsed.data);
  res.status(201).json(post);
});

blogRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const post = await blogService.updatePost(id, req.body);
  res.json(post);
});

blogRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await blogService.softDeletePost(id);
  res.status(204).send();
});

blogRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await blogService.listAllPosts(req.locale, pagination);
  res.json(result);
});
```

- [ ] **Step 3: Write blog tests (similar pattern to treatments)**

- [ ] **Step 4: Run blog tests**

Run: `cd server && npx vitest run tests/blog.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add blog CRUD routes with soft-delete"
```

---

### Task 4.4: Comments Routes

**Files:**
- Create: `server/src/services/comments.service.ts`
- Create: `server/src/routes/comments.routes.ts`

- [ ] **Step 1: Create comments service**

```typescript
import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listApprovedComments(postId: number, pagination: PaginationParams) {
  const where = { postId, isApproved: true };
  const [data, total] = await Promise.all([
    prisma.comment.findMany({ where, orderBy: { createdAt: "desc" }, ...paginate(pagination) }),
    prisma.comment.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function createComment(data: { postId: number; authorName: string; content: string }) {
  return prisma.comment.create({ data });
}

export async function listPendingComments(pagination: PaginationParams) {
  const where = { isApproved: false };
  const [data, total] = await Promise.all([
    prisma.comment.findMany({ where, orderBy: { createdAt: "desc" }, include: { post: { select: { title: true } } }, ...paginate(pagination) }),
    prisma.comment.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function approveComment(id: number) {
  return prisma.comment.update({ where: { id }, data: { isApproved: true } });
}

export async function deleteComment(id: number) {
  return prisma.comment.delete({ where: { id } });
}
```

- [ ] **Step 2: Create comments routes**

```typescript
import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { paginationSchema } from "../utils/pagination.js";
import * as commentService from "../services/comments.service.js";

export const commentRoutes = Router();

// Public: get approved comments for a post
commentRoutes.get("/post/:postId", async (req: Request, res: Response) => {
  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }
  const pagination = paginationSchema.parse(req.query);
  const result = await commentService.listApprovedComments(postId, pagination);
  res.json(result);
});

// Public: submit comment (rate-limited)
const createCommentSchema = z.object({
  postId: z.number().int().positive(),
  authorName: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  honeypot: z.string().max(0).optional(), // Must be empty
});

commentRoutes.post("/", rateLimit(3, 15 * 60 * 1000), async (req: Request, res: Response) => {
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (parsed.data.honeypot) {
    // Bot detected, silently accept
    res.status(201).json({ message: "Comment submitted for review" });
    return;
  }
  await commentService.createComment({
    postId: parsed.data.postId,
    authorName: parsed.data.authorName,
    content: parsed.data.content,
  });
  res.status(201).json({ message: "Comment submitted for review" });
});

// Admin: list pending
commentRoutes.get("/admin/pending", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await commentService.listPendingComments(pagination);
  res.json(result);
});

// Admin: approve
commentRoutes.patch("/:id/approve", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const comment = await commentService.approveComment(id);
  res.json(comment);
});

// Admin: delete
commentRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await commentService.deleteComment(id);
  res.status(204).send();
});
```

- [ ] **Step 3: Write comments tests**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add comments routes with rate-limiting and honeypot"
```

---

### Task 4.5: Lectures CRUD

**Files:**
- Create: `server/src/services/lectures.service.ts`
- Create: `server/src/routes/lectures.routes.ts`

- [ ] **Step 1: Create lectures service**

```typescript
import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listUpcomingLectures(locale: string, pagination: PaginationParams) {
  const where = { locale, isActive: true, date: { gte: new Date() } };
  const [data, total] = await Promise.all([
    prisma.lecture.findMany({ where, orderBy: { date: "asc" }, ...paginate(pagination) }),
    prisma.lecture.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function getLectureBySlug(slug: string, locale: string) {
  return prisma.lecture.findUnique({ where: { slug_locale: { slug, locale } } });
}

export async function createLecture(data: {
  slug: string;
  locale: string;
  title: string;
  description: string;
  date: Date;
  location?: string;
  price?: string;
  imageUrl?: string;
}) {
  return prisma.lecture.create({ data });
}

export async function updateLecture(id: number, data: Partial<{
  title: string;
  description: string;
  date: Date;
  location: string;
  price: string;
  imageUrl: string;
  isActive: boolean;
}>) {
  return prisma.lecture.update({ where: { id }, data });
}

export async function listAllLectures(locale: string, pagination: PaginationParams) {
  const where = { locale };
  const [data, total] = await Promise.all([
    prisma.lecture.findMany({ where, orderBy: { date: "desc" }, ...paginate(pagination) }),
    prisma.lecture.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}
```

- [ ] **Step 2: Create lectures routes**

```typescript
import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as lectureService from "../services/lectures.service.js";

export const lectureRoutes = Router();

lectureRoutes.get("/", async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await lectureService.listUpcomingLectures(req.locale, pagination);
  res.json(result);
});

lectureRoutes.get("/:slug", async (req: Request, res: Response) => {
  const lecture = await lectureService.getLectureBySlug(req.params.slug, req.locale);
  if (!lecture) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(lecture);
});

const createLectureSchema = z.object({
  slug: z.string().min(1),
  locale: z.string().default("he"),
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.coerce.date(),
  location: z.string().optional(),
  price: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

lectureRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = createLectureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const lecture = await lectureService.createLecture(parsed.data);
  res.status(201).json(lecture);
});

lectureRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const lecture = await lectureService.updateLecture(id, req.body);
  res.json(lecture);
});

lectureRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await lectureService.listAllLectures(req.locale, pagination);
  res.json(result);
});
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add lectures CRUD routes"
```

---

### Task 4.6: Songs CRUD

**Files:**
- Create: `server/src/services/songs.service.ts`
- Create: `server/src/routes/songs.routes.ts`

- [ ] **Step 1: Create songs service**

```typescript
import { PrismaClient } from "@prisma/client";
import { paginate, paginatedResponse, PaginationParams } from "../utils/pagination.js";

const prisma = new PrismaClient();

export async function listSongs(locale: string, pagination: PaginationParams) {
  const where = { locale };
  const [data, total] = await Promise.all([
    prisma.song.findMany({ where, orderBy: { sortOrder: "asc" }, ...paginate(pagination) }),
    prisma.song.count({ where }),
  ]);
  return paginatedResponse(data, total, pagination);
}

export async function createSong(data: { locale: string; title: string; lyrics: string; sortOrder?: number }) {
  return prisma.song.create({ data });
}

export async function updateSong(id: number, data: Partial<{ title: string; lyrics: string; sortOrder: number }>) {
  return prisma.song.update({ where: { id }, data });
}

export async function deleteSong(id: number) {
  return prisma.song.delete({ where: { id } });
}
```

- [ ] **Step 2: Create songs routes**

```typescript
import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as songService from "../services/songs.service.js";

export const songRoutes = Router();

songRoutes.get("/", async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await songService.listSongs(req.locale, pagination);
  res.json(result);
});

const createSongSchema = z.object({
  locale: z.string().default("he"),
  title: z.string().min(1),
  lyrics: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

songRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = createSongSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const song = await songService.createSong(parsed.data);
  res.status(201).json(song);
});

songRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const song = await songService.updateSong(id, req.body);
  res.json(song);
});

songRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await songService.deleteSong(id);
  res.status(204).send();
});
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add songs CRUD routes"
```

---

### Task 4.7: Site Content CRUD

**Files:**
- Create: `server/src/services/content.service.ts`
- Create: `server/src/routes/content.routes.ts`

- [ ] **Step 1: Create content service**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getContent(key: string, locale: string) {
  return prisma.siteContent.findUnique({ where: { key_locale: { key, locale } } });
}

export async function getAllContent(locale: string) {
  return prisma.siteContent.findMany({ where: { locale } });
}

export async function upsertContent(key: string, locale: string, value: string) {
  return prisma.siteContent.upsert({
    where: { key_locale: { key, locale } },
    update: { value },
    create: { key, locale, value },
  });
}
```

- [ ] **Step 2: Create content routes**

```typescript
import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import * as contentService from "../services/content.service.js";

export const contentRoutes = Router();

contentRoutes.get("/:key", async (req: Request, res: Response) => {
  const content = await contentService.getContent(req.params.key, req.locale);
  if (!content) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(content);
});

contentRoutes.get("/", async (req: Request, res: Response) => {
  const content = await contentService.getAllContent(req.locale);
  res.json(content);
});

const upsertSchema = z.object({
  key: z.string().min(1),
  locale: z.string().default("he"),
  value: z.string().min(1),
});

contentRoutes.put("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const content = await contentService.upsertContent(parsed.data.key, parsed.data.locale, parsed.data.value);
  res.json(content);
});
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add site content routes with upsert"
```

---

## Phase 5: Frontend Core Setup

### Task 5.1: Angular Styles and Theme

**Files:**
- Create: `client/src/styles/_variables.scss`
- Create: `client/src/styles/_typography.scss`
- Create: `client/src/styles/_mixins.scss`
- Modify: `client/src/styles.scss`

- [ ] **Step 1: Create _variables.scss**

```scss
:root {
  --color-primary: #7B5EA7;
  --color-primary-light: #9B7EC7;
  --color-primary-dark: #5B3E87;
  --color-secondary: #D4A5B5;
  --color-accent: #8B7D3C;
  --color-bg: #FFFFFF;
  --color-bg-alt: #F5F0F8;
  --color-text: #2D2D2D;
  --color-text-light: #6B6B6B;
  --color-border: #E8E0EF;
  --color-error: #D32F2F;
  --color-success: #388E3C;

  --font-family: 'Heebo', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 2rem;
  --font-size-3xl: 2.5rem;

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);

  --max-width: 1200px;
  --header-height: 72px;
}
```

- [ ] **Step 2: Create _typography.scss**

```scss
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap');

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: 1.6;
  color: var(--color-text);
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
  line-height: 1.3;
  margin-block-end: var(--spacing-md);
}

h1 { font-size: var(--font-size-3xl); }
h2 { font-size: var(--font-size-2xl); }
h3 { font-size: var(--font-size-xl); }
h4 { font-size: var(--font-size-lg); }
```

- [ ] **Step 3: Create _mixins.scss**

```scss
@mixin responsive($breakpoint) {
  @if $breakpoint == sm { @media (min-width: 640px) { @content; } }
  @if $breakpoint == md { @media (min-width: 768px) { @content; } }
  @if $breakpoint == lg { @media (min-width: 1024px) { @content; } }
  @if $breakpoint == xl { @media (min-width: 1280px) { @content; } }
}

@mixin container {
  max-width: var(--max-width);
  margin-inline: auto;
  padding-inline: var(--spacing-lg);
}

@mixin card {
  background: var(--color-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-xl);
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: var(--shadow-lg);
  }
}
```

- [ ] **Step 4: Update global styles.scss**

```scss
@use 'styles/variables';
@use 'styles/typography';
@use 'styles/mixins';

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  direction: rtl;
}

body {
  background-color: var(--color-bg);
  min-height: 100vh;
}

a {
  color: var(--color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

button {
  cursor: pointer;
  font-family: inherit;
}

.container {
  @include mixins.container;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 500;
  border: none;
  transition: all 0.2s ease;

  &--primary {
    background: var(--color-primary);
    color: white;
    &:hover { background: var(--color-primary-dark); }
  }

  &--secondary {
    background: var(--color-secondary);
    color: var(--color-text);
    &:hover { opacity: 0.9; }
  }

  &--outline {
    background: transparent;
    border: 2px solid var(--color-primary);
    color: var(--color-primary);
    &:hover { background: var(--color-bg-alt); }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add global styles with RTL, Heebo font, and design tokens"
```

---

### Task 5.2: Core Services

**Files:**
- Create: `client/src/app/core/services/api.service.ts`
- Create: `client/src/app/core/services/auth.service.ts`
- Create: `client/src/app/core/services/seo.service.ts`
- Create: `client/src/app/core/services/whatsapp.service.ts`
- Create: `client/src/app/core/interceptors/locale.interceptor.ts`
- Create: `client/src/app/core/interceptors/auth.interceptor.ts`
- Create: `client/src/app/core/guards/auth.guard.ts`

- [ ] **Step 1: Create API service**

```typescript
import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

@Injectable({ providedIn: "root" })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        httpParams = httpParams.set(key, String(value));
      });
    }
    return this.http.get<T>(`${this.baseUrl}${path}`, { params: httpParams });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body);
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${path}`);
  }
}
```

- [ ] **Step 2: Create auth service**

```typescript
import { Injectable, inject, signal } from "@angular/core";
import { ApiService } from "./api.service";
import { tap } from "rxjs";

@Injectable({ providedIn: "root" })
export class AuthService {
  private api = inject(ApiService);
  private tokenKey = "einat_token";

  isLoggedIn = signal(this.hasToken());

  login(password: string) {
    return this.api.post<{ token: string }>("/auth/login", { password }).pipe(
      tap((res) => {
        localStorage.setItem(this.tokenKey, res.token);
        this.isLoggedIn.set(true);
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.isLoggedIn.set(false);
  }

  getToken(): string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(this.tokenKey);
  }

  private hasToken(): boolean {
    if (typeof localStorage === "undefined") return false;
    return !!localStorage.getItem(this.tokenKey);
  }
}
```

- [ ] **Step 3: Create WhatsApp service**

```typescript
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class WhatsappService {
  private phoneNumber = "972501234567"; // Configure from site content

  buildLink(message: string): string {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${this.phoneNumber}?text=${encoded}`;
  }

  buildTreatmentLink(treatmentTitle: string): string {
    const message = `שלום, אני מתעניין/ת בטיפול: ${treatmentTitle}`;
    return this.buildLink(message);
  }
}
```

- [ ] **Step 4: Create SEO service**

```typescript
import { Injectable, inject } from "@angular/core";
import { Meta, Title } from "@angular/platform-browser";

@Injectable({ providedIn: "root" })
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);

  updateMeta(config: { title: string; description?: string; image?: string }) {
    this.title.setTitle(`${config.title} | עינת שומונוב`);
    if (config.description) {
      this.meta.updateTag({ name: "description", content: config.description });
      this.meta.updateTag({ property: "og:description", content: config.description });
    }
    this.meta.updateTag({ property: "og:title", content: config.title });
    if (config.image) {
      this.meta.updateTag({ property: "og:image", content: config.image });
    }
  }
}
```

- [ ] **Step 5: Create locale interceptor**

```typescript
import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { TranslocoService } from "@jsverse/transloco";

export const localeInterceptor: HttpInterceptorFn = (req, next) => {
  const transloco = inject(TranslocoService);
  const locale = transloco.getActiveLang();
  const cloned = req.clone({
    params: req.params.set("locale", locale),
  });
  return next(cloned);
};
```

- [ ] **Step 6: Create auth interceptor**

```typescript
import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set("Authorization", `Bearer ${token}`),
    });
    return next(cloned);
  }
  return next(req);
};
```

- [ ] **Step 7: Create auth guard**

```typescript
import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }
  return router.parseUrl("/admin/login");
};
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add core services, interceptors, and auth guard"
```

---

### Task 5.3: Transloco Configuration and Hebrew Translations

**Files:**
- Create: `client/src/assets/i18n/he.json`
- Modify: `client/src/assets/i18n/en.json`

- [ ] **Step 1: Create Hebrew translations**

```json
{
  "nav": {
    "home": "ראשי",
    "treatments": "טיפולים",
    "blog": "בלוג",
    "lectures": "הרצאות",
    "songs": "שירים",
    "about": "אודות",
    "contact": "צור קשר"
  },
  "home": {
    "hero_title": "עינת שומונוב",
    "hero_subtitle": "ריפוי, מדיטציה ושלווה פנימית",
    "treatments_section": "הטיפולים שלי",
    "blog_section": "מהבלוג",
    "upcoming_lectures": "הרצאות קרובות"
  },
  "treatments": {
    "title": "טיפולים",
    "book_via_whatsapp": "לתיאום דרך וואטסאפ",
    "price": "מחיר"
  },
  "blog": {
    "title": "בלוג",
    "read_more": "קרא עוד",
    "comments": "תגובות",
    "leave_comment": "השאר תגובה",
    "your_name": "שמך",
    "comment_text": "תוכן התגובה",
    "submit": "שלח",
    "comment_pending": "התגובה נשלחה ותאושר בקרוב"
  },
  "lectures": {
    "title": "הרצאות",
    "date": "תאריך",
    "location": "מיקום",
    "price": "מחיר"
  },
  "songs": {
    "title": "שירים"
  },
  "about": {
    "title": "אודות"
  },
  "contact": {
    "title": "צור קשר",
    "whatsapp": "שלח הודעה בוואטסאפ",
    "email": "אימייל",
    "phone": "טלפון"
  },
  "common": {
    "loading": "טוען...",
    "error": "אירעה שגיאה",
    "not_found": "הדף לא נמצא",
    "back": "חזרה"
  }
}
```

- [ ] **Step 2: Create English translations (same keys, English values)**

```json
{
  "nav": {
    "home": "Home",
    "treatments": "Treatments",
    "blog": "Blog",
    "lectures": "Lectures",
    "songs": "Songs",
    "about": "About",
    "contact": "Contact"
  },
  "home": {
    "hero_title": "Einat Shomonov",
    "hero_subtitle": "Healing, Meditation & Inner Peace",
    "treatments_section": "My Treatments",
    "blog_section": "From the Blog",
    "upcoming_lectures": "Upcoming Lectures"
  },
  "treatments": {
    "title": "Treatments",
    "book_via_whatsapp": "Book via WhatsApp",
    "price": "Price"
  },
  "blog": {
    "title": "Blog",
    "read_more": "Read More",
    "comments": "Comments",
    "leave_comment": "Leave a Comment",
    "your_name": "Your Name",
    "comment_text": "Comment",
    "submit": "Submit",
    "comment_pending": "Comment submitted and will be approved shortly"
  },
  "lectures": {
    "title": "Lectures",
    "date": "Date",
    "location": "Location",
    "price": "Price"
  },
  "songs": {
    "title": "Songs"
  },
  "about": {
    "title": "About"
  },
  "contact": {
    "title": "Contact",
    "whatsapp": "Send WhatsApp Message",
    "email": "Email",
    "phone": "Phone"
  },
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "not_found": "Page not found",
    "back": "Back"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Hebrew and English translation files"
```

---

### Task 5.4: App Routing

**Files:**
- Modify: `client/src/app/app.routes.ts`

- [ ] **Step 1: Define all routes**

```typescript
import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  { path: "", loadComponent: () => import("./pages/home/home.component").then(m => m.HomeComponent) },
  { path: "treatments", loadComponent: () => import("./pages/treatments/treatment-list.component").then(m => m.TreatmentListComponent) },
  { path: "treatments/:slug", loadComponent: () => import("./pages/treatments/treatment-detail.component").then(m => m.TreatmentDetailComponent) },
  { path: "blog", loadComponent: () => import("./pages/blog/blog-list.component").then(m => m.BlogListComponent) },
  { path: "blog/:slug", loadComponent: () => import("./pages/blog/blog-post.component").then(m => m.BlogPostComponent) },
  { path: "lectures", loadComponent: () => import("./pages/lectures/lectures.component").then(m => m.LecturesComponent) },
  { path: "songs", loadComponent: () => import("./pages/songs/songs.component").then(m => m.SongsComponent) },
  { path: "about", loadComponent: () => import("./pages/about/about.component").then(m => m.AboutComponent) },
  { path: "contact", loadComponent: () => import("./pages/contact/contact.component").then(m => m.ContactComponent) },
  {
    path: "admin",
    canActivate: [authGuard],
    loadChildren: () => import("./admin/admin.routes").then(m => m.adminRoutes),
  },
  { path: "admin/login", loadComponent: () => import("./admin/login/login.component").then(m => m.LoginComponent) },
  { path: "**", loadComponent: () => import("./pages/not-found/not-found.component").then(m => m.NotFoundComponent) },
];
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add lazy-loaded routes for all pages"
```

---

## Phase 6: Frontend Pages

### Task 6.1: Shared Components (Header, Footer, Card)

**Files:**
- Create: `client/src/app/shared/components/header/header.component.ts`
- Create: `client/src/app/shared/components/header/header.component.html`
- Create: `client/src/app/shared/components/header/header.component.scss`
- Create: `client/src/app/shared/components/footer/footer.component.ts`
- Create: `client/src/app/shared/components/footer/footer.component.html`
- Create: `client/src/app/shared/components/footer/footer.component.scss`

- [ ] **Step 1: Create header component**

Component with responsive nav, logo, language switcher placeholder. Uses Transloco for nav labels. Mobile hamburger menu.

```typescript
import { Component, signal } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { TranslocoModule } from "@jsverse/transloco";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslocoModule],
  templateUrl: "./header.component.html",
  styleUrl: "./header.component.scss",
})
export class HeaderComponent {
  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }
}
```

Header HTML with nav links: home, treatments, blog, lectures, songs, about, contact.

- [ ] **Step 2: Create footer component**

Simple footer with copyright, social links placeholder, WhatsApp link.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add shared header and footer components"
```

---

### Task 6.2: Home Page

**Files:**
- Create: `client/src/app/pages/home/home.component.ts`
- Create: `client/src/app/pages/home/home.component.html`
- Create: `client/src/app/pages/home/home.component.scss`

- [ ] **Step 1: Create home component**

Sections: Hero with background, treatment cards grid, latest blog posts (3), upcoming lectures (3). Each section links to its full page.

```typescript
import { Component, inject, OnInit } from "@angular/core";
import { TranslocoModule } from "@jsverse/transloco";
import { RouterLink } from "@angular/router";
import { ApiService, PaginatedResponse } from "../../core/services/api.service";
import { SeoService } from "../../core/services/seo.service";

interface Treatment {
  id: number; slug: string; title: string; subtitle: string; imageUrl: string;
}

interface BlogPost {
  id: number; slug: string; title: string; excerpt: string; publishedAt: string;
}

interface Lecture {
  id: number; slug: string; title: string; date: string; location: string;
}

@Component({
  selector: "app-home",
  standalone: true,
  imports: [TranslocoModule, RouterLink],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent implements OnInit {
  private api = inject(ApiService);
  private seo = inject(SeoService);

  treatments: Treatment[] = [];
  blogPosts: BlogPost[] = [];
  lectures: Lecture[] = [];

  ngOnInit() {
    this.seo.updateMeta({ title: "ראשי", description: "עינת שומונוב - ריפוי, מדיטציה ושלווה פנימית" });
    this.api.get<PaginatedResponse<Treatment>>("/treatments", { limit: 6 }).subscribe(res => this.treatments = res.data);
    this.api.get<PaginatedResponse<BlogPost>>("/blog", { limit: 3 }).subscribe(res => this.blogPosts = res.data);
    this.api.get<PaginatedResponse<Lecture>>("/lectures", { limit: 3 }).subscribe(res => this.lectures = res.data);
  }
}
```

- [ ] **Step 2: Create home template with hero, treatments grid, blog preview, lectures preview**

- [ ] **Step 3: Style with cards, responsive grid, hover effects**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add home page with hero, treatments, blog, and lectures sections"
```

---

### Task 6.3: Treatment Pages

**Files:**
- Create: `client/src/app/pages/treatments/treatment-list.component.ts`
- Create: `client/src/app/pages/treatments/treatment-detail.component.ts`

- [ ] **Step 1: Create treatment list component**

Grid of treatment cards, each links to detail page. Shows title, subtitle, image.

- [ ] **Step 2: Create treatment detail component**

Full description, price, WhatsApp deep link button (`buildTreatmentLink`).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add treatment list and detail pages with WhatsApp links"
```

---

### Task 6.4: Blog Pages

**Files:**
- Create: `client/src/app/pages/blog/blog-list.component.ts`
- Create: `client/src/app/pages/blog/blog-post.component.ts`

- [ ] **Step 1: Create blog list with pagination**

List of blog posts with title, excerpt, date. Pagination controls at bottom.

- [ ] **Step 2: Create blog post detail with comments**

Full post content, comment list (approved), comment form with name + content + honeypot field.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add blog list and post detail with comments"
```

---

### Task 6.5: Lectures Page

**Files:**
- Create: `client/src/app/pages/lectures/lectures.component.ts`

- [ ] **Step 1: Create lectures component**

Timeline/calendar view of upcoming lectures. Each shows title, date, location, price. Past lectures hidden or grayed out.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add lectures page with timeline view"
```

---

### Task 6.6: Songs Page

**Files:**
- Create: `client/src/app/pages/songs/songs.component.ts`

- [ ] **Step 1: Create songs component**

List of songs with expandable lyrics (accordion or click-to-expand). Clean typography for lyrics with line breaks preserved.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add songs page with expandable lyrics"
```

---

### Task 6.7: About and Contact Pages

**Files:**
- Create: `client/src/app/pages/about/about.component.ts`
- Create: `client/src/app/pages/contact/contact.component.ts`

- [ ] **Step 1: Create about page**

Pulls content from `/api/content/about`. Renders as rich text. Photo placeholder.

- [ ] **Step 2: Create contact page**

WhatsApp button (prominent), email, phone. Simple layout with icons. WhatsApp opens pre-filled message.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add about and contact pages with WhatsApp integration"
```

---

## Phase 7: Admin Panel

### Task 7.1: Admin Layout and Login

**Files:**
- Create: `client/src/app/admin/admin.routes.ts`
- Create: `client/src/app/admin/admin-layout.component.ts`
- Create: `client/src/app/admin/login/login.component.ts`

- [ ] **Step 1: Create admin routes**

```typescript
import { Routes } from "@angular/router";
import { authGuard } from "../core/guards/auth.guard";

export const adminRoutes: Routes = [
  {
    path: "",
    loadComponent: () => import("./admin-layout.component").then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: "", redirectTo: "treatments", pathMatch: "full" },
      { path: "treatments", loadComponent: () => import("./treatments/treatment-editor.component").then(m => m.TreatmentEditorComponent) },
      { path: "blog", loadComponent: () => import("./blog/post-editor.component").then(m => m.PostEditorComponent) },
      { path: "comments", loadComponent: () => import("./comments/comment-moderation.component").then(m => m.CommentModerationComponent) },
      { path: "lectures", loadComponent: () => import("./lectures/lecture-editor.component").then(m => m.LectureEditorComponent) },
      { path: "songs", loadComponent: () => import("./songs/song-editor.component").then(m => m.SongEditorComponent) },
      { path: "content", loadComponent: () => import("./content/content-editor.component").then(m => m.ContentEditorComponent) },
    ],
  },
];
```

- [ ] **Step 2: Create admin layout with sidebar nav**

Simple sidebar with links to each admin section. Logout button. Content area with router-outlet.

- [ ] **Step 3: Create login component**

Password-only form. On success, redirects to /admin. On failure, shows error message.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add admin layout, routes, and login"
```

---

### Task 7.2: Admin CRUD Components

**Files:**
- Create: `client/src/app/admin/treatments/treatment-editor.component.ts`
- Create: `client/src/app/admin/blog/post-editor.component.ts`
- Create: `client/src/app/admin/comments/comment-moderation.component.ts`
- Create: `client/src/app/admin/lectures/lecture-editor.component.ts`
- Create: `client/src/app/admin/songs/song-editor.component.ts`
- Create: `client/src/app/admin/content/content-editor.component.ts`

- [ ] **Step 1: Create treatment editor**

Table listing all treatments (active/inactive). Create/edit form with fields: title, slug (auto-generated), subtitle, description (textarea), price, imageUrl, sortOrder, isActive toggle.

- [ ] **Step 2: Create blog post editor**

Table listing all posts. Create/edit form with: title, slug, excerpt, content (textarea/rich text), imageUrl, publishedAt (date picker or null for draft).

- [ ] **Step 3: Create comment moderation**

List of pending comments with post title. Approve/delete buttons per comment. Bulk actions optional.

- [ ] **Step 4: Create lecture editor**

Table listing all lectures. Form with: title, slug, description, date, location, price, imageUrl, isActive.

- [ ] **Step 5: Create song editor**

List of songs. Form with: title, lyrics (textarea), sortOrder. Delete button.

- [ ] **Step 6: Create content editor**

Key-value editor for site content (about text, contact details). Each key shows current value with edit button.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add admin CRUD components for all entities"
```

---

## Phase 8: SSR, SEO & Polish

### Task 8.1: Angular SSR Configuration

**Files:**
- Modify: `client/src/main.server.ts`
- Modify: `client/angular.json` (SSR settings)

- [ ] **Step 1: Verify SSR build works**

Run: `cd client && npx ng build`
Expected: Both browser and server bundles produced in `dist/client/`

- [ ] **Step 2: Test SSR serves correctly**

Run: `cd client && node dist/client/server/server.mjs`
Expected: Server starts, pages render with full HTML (check view-source for content)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: configure and verify Angular SSR"
```

---

### Task 8.2: SEO Meta Tags

**Files:**
- Modify: All page components (add SeoService calls in ngOnInit)

- [ ] **Step 1: Add SEO meta to each page**

Each page component calls `seoService.updateMeta()` with appropriate title and description based on page content.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add SEO meta tags to all pages"
```

---

### Task 8.3: Error Pages and Loading States

**Files:**
- Create: `client/src/app/pages/not-found/not-found.component.ts`
- Create: `client/src/app/shared/components/loading/loading.component.ts`

- [ ] **Step 1: Create 404 page**

Friendly "page not found" with link back to home. Uses design system colors/typography.

- [ ] **Step 2: Create loading spinner component**

Reusable loading spinner with the brand purple color.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add 404 page and loading component"
```

---

### Task 8.4: Final Integration Test

- [ ] **Step 1: Start full stack**

Run:
```bash
docker-compose up -d
cd server && npm run dev &
cd client && npx ng serve &
```

- [ ] **Step 2: Verify public pages**

- Home page loads with treatments, blog, lectures
- Treatment detail page shows WhatsApp link
- Blog post shows comments
- Lectures page shows upcoming events
- Songs page shows lyrics
- About page shows content
- Contact page shows WhatsApp button

- [ ] **Step 3: Verify admin panel**

- Login with password
- Create/edit/delete treatments
- Create/edit/soft-delete blog posts
- Approve/delete comments
- Create/edit lectures
- Create/edit/delete songs
- Edit site content

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final integration verification"
```

---

## Summary

| Phase | Tasks | Commits |
|-------|-------|---------|
| 1. Scaffolding | 3 | 3 |
| 2. Database | 2 | 2 |
| 3. Backend Core | 3 | 3 |
| 4. Backend CRUD | 7 | 7 |
| 5. Frontend Core | 4 | 4 |
| 6. Frontend Pages | 7 | 7 |
| 7. Admin Panel | 2 | 2 |
| 8. SSR & Polish | 4 | 4 |
| **Total** | **32** | **32** |
