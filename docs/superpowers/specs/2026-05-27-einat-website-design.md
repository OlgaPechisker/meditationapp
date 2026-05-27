# Einat Shomonov — Meditation & Healing Professional Website

**Date:** 2026-05-27  
**Status:** Approved  
**Tagline:** לבחור בחיים להיות אהבה

---

## 1. Overview

A professional website for Einat Shomonov (עינת שומונוב), a meditation and healing practitioner. The site serves as a digital presence to showcase treatments, share blog content, display upcoming lectures/masterclasses, present original songs (lyrics), and facilitate contact via WhatsApp.

### Goals
- Present services professionally with dedicated pages per treatment
- Allow content self-management via admin panel
- Support Hebrew (RTL) with future English expansion
- Prepare for future payment integration and user registration

### Non-Goals (for now)
- Online payment processing
- User registration / login for visitors
- Audio/video playback
- Online booking/scheduling system

---

## 2. Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19 with SSR (`@angular/ssr`) |
| i18n (UI) | Transloco (translation keys in JSON files) |
| i18n (Content) | Locale-per-record pattern in PostgreSQL |
| Styling | SCSS with CSS custom properties |
| Backend | Node.js + Express (TypeScript) |
| ORM | Prisma |
| Database | PostgreSQL |
| Rich Text Editor | Quill or TipTap (admin blog/descriptions) |
| Auth | JWT (admin-only for now) |
| WhatsApp | `wa.me` deep links |

### Monorepo Structure

```
/einat
├── /client                     # Angular 19 app
│   ├── /src
│   │   ├── /app
│   │   │   ├── /core           # Services, guards, interceptors, locale middleware
│   │   │   ├── /shared         # Shared components, pipes, directives
│   │   │   ├── /features
│   │   │   │   ├── /home       # Hero + treatment cards + blog highlights
│   │   │   │   ├── /treatments # Treatment list + individual treatment pages
│   │   │   │   ├── /blog       # Blog list + post detail + comments
│   │   │   │   ├── /lectures   # Lectures list with calendar view
│   │   │   │   ├── /about      # About page
│   │   │   │   ├── /songs      # Songs/lyrics list
│   │   │   │   ├── /contact    # Contact info + WhatsApp
│   │   │   │   └── /admin      # Lazy-loaded admin module
│   │   │   └── app.routes.ts
│   │   ├── /assets
│   │   │   └── /i18n           # he.json, en.json (Transloco)
│   │   └── /styles             # Global SCSS, RTL setup, theme variables
│   └── angular.json
├── /server                     # Express API
│   ├── /src
│   │   ├── /routes             # Route definitions
│   │   ├── /controllers        # Request handlers
│   │   ├── /services           # Business logic
│   │   ├── /middleware         # Auth, locale, rate-limit, validation
│   │   └── index.ts
│   └── package.json
├── /prisma                     # DB schema & migrations
│   └── schema.prisma
├── /uploads                    # Uploaded images (gitignored)
├── package.json                # Root workspace
├── docker-compose.yml          # PostgreSQL for local dev
└── tsconfig.base.json          # Shared TS config
```

### Key Architectural Decisions

1. **SSR for SEO** — Angular Universal renders pages server-side for search engine visibility
2. **Locale middleware** — All public API requests resolve locale from `?locale=` query param or `Accept-Language` header, defaulting to `he`
3. **Admin as lazy module** — Single deployment, admin routes protected by JWT guard
4. **Deployment-agnostic** — No cloud-specific dependencies; runs anywhere Node.js runs

---

## 3. Pages & Routing

### Public Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, treatment cards, latest blog, about preview |
| `/treatments/:slug` | Treatment Detail | Full description, price, WhatsApp CTA |
| `/blog` | Blog List | Paginated list of published posts |
| `/blog/:slug` | Blog Post | Full content + comments section |
| `/lectures` | Lectures | Upcoming events, calendar/list view |
| `/about` | About | Practitioner bio (admin-editable rich text) |
| `/songs` | Songs | List of song titles + lyrics text |
| `/contact` | Contact | WhatsApp, phone, email, social links |

### Admin Routes (lazy-loaded, JWT-protected)

| Route | Function |
|-------|----------|
| `/admin` | Dashboard |
| `/admin/treatments` | CRUD treatments |
| `/admin/blog` | CRUD blog posts |
| `/admin/blog/comments` | Comment moderation |
| `/admin/lectures` | CRUD lectures |
| `/admin/songs` | CRUD songs |
| `/admin/content` | Edit site content (about, contact, home) |

---

## 4. Data Model

### Treatment
```prisma
model Treatment {
  id          String   @id @default(cuid())
  slug        String
  locale      String   @default("he")
  title       String
  description String   @db.Text
  price       String
  image       String?
  whatsappMsg String
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([slug, locale])
}
```

### BlogPost
```prisma
model BlogPost {
  id          String    @id @default(cuid())
  slug        String
  locale      String    @default("he")
  title       String
  content     String    @db.Text
  excerpt     String?
  coverImage  String?
  published   Boolean   @default(false)
  publishedAt DateTime?
  deletedAt   DateTime? // soft-delete
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  comments    Comment[]

  @@unique([slug, locale])
}
```

### Comment
```prisma
model Comment {
  id         String   @id @default(cuid())
  postId     String
  authorName String
  email      String?
  content    String   @db.Text
  ipAddress  String
  approved   Boolean  @default(false)
  flagged    Boolean  @default(false)
  createdAt  DateTime @default(now())

  post BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
}
```

### Lecture
```prisma
model Lecture {
  id          String   @id @default(cuid())
  slug        String?
  locale      String   @default("he")
  title       String
  description String   @db.Text
  dateTime    DateTime
  location    String?
  image       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([slug, locale])
}
```

### Song
```prisma
model Song {
  id        String   @id @default(cuid())
  locale    String   @default("he")
  title     String
  text      String   @db.Text
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([title, locale])
}
```

### SiteContent
```prisma
model SiteContent {
  key       String
  locale    String   @default("he")
  value     Json
  updatedAt DateTime @updatedAt

  @@id([key, locale])
}
```

### AdminUser
```prisma
model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

---

## 5. API Design

### Conventions
- Base path: `/api/v1/`
- All list endpoints support `?locale=he` (default: `he`)
- All list endpoints support pagination: `?page=1&limit=20`
- Response format: `{ data: T | T[], meta?: { page, limit, total } }`
- Error format: `{ error: string, details?: any }`

### Public Endpoints

```
GET  /api/v1/treatments              → active treatments (locale-filtered)
GET  /api/v1/treatments/:slug        → single treatment by slug + locale
GET  /api/v1/blog                    → published posts (paginated, locale-filtered)
GET  /api/v1/blog/:slug              → single published post
GET  /api/v1/blog/:slug/comments     → approved comments (paginated)
POST /api/v1/blog/:slug/comments     → submit comment (rate-limited)
GET  /api/v1/lectures                → upcoming lectures (locale-filtered)
GET  /api/v1/songs                   → all songs (paginated, locale-filtered)
GET  /api/v1/content/:key            → site content by key + locale
```

### Admin Endpoints (JWT-protected)

```
POST   /api/v1/auth/login            → admin login, returns JWT

GET    /api/v1/admin/treatments      → all treatments (incl. inactive)
GET    /api/v1/admin/treatments/:id  → single by ID
POST   /api/v1/admin/treatments      → create treatment
PUT    /api/v1/admin/treatments/:id  → update treatment
DELETE /api/v1/admin/treatments/:id  → deactivate treatment

GET    /api/v1/admin/blog            → all posts (incl. drafts, deleted)
GET    /api/v1/admin/blog/:id        → single by ID
POST   /api/v1/admin/blog            → create post
PUT    /api/v1/admin/blog/:id        → update post
DELETE /api/v1/admin/blog/:id        → soft-delete post

GET    /api/v1/admin/lectures        → all lectures
GET    /api/v1/admin/lectures/:id    → single by ID
POST   /api/v1/admin/lectures        → create lecture
PUT    /api/v1/admin/lectures/:id    → update lecture
DELETE /api/v1/admin/lectures/:id    → deactivate lecture

GET    /api/v1/admin/songs           → all songs
GET    /api/v1/admin/songs/:id       → single by ID
POST   /api/v1/admin/songs           → create song
PUT    /api/v1/admin/songs/:id       → update song
DELETE /api/v1/admin/songs/:id       → delete song

GET    /api/v1/admin/comments        → all comments (filterable by approved/flagged)
PUT    /api/v1/admin/comments/:id    → approve/reject comment
DELETE /api/v1/admin/comments/:id    → delete comment

GET    /api/v1/admin/content         → all site content keys
PUT    /api/v1/admin/content/:key    → upsert site content
```

### Comment Spam Prevention
- Rate limiting: 3 comments per 15-minute window per IP
- Honeypot field: hidden `website` field — if filled, silently reject
- IP address stored for moderation purposes
- All comments default to `approved: false`

---

## 6. Visual Design

### Brand Identity
- **Name:** עינת שומונוב (Einat Shomonov)
- **Tagline:** לבחור בחיים להיות אהבה
- **Logo:** White dove with purple outline carrying a rose

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#7B5EA7` | Headers, buttons, navbar accents |
| `--color-primary-light` | `#9B7FC7` | Hover states |
| `--color-primary-dark` | `#5A3D87` | Active states |
| `--color-secondary` | `#D4A5B5` | Card highlights, soft accents |
| `--color-accent` | `#8B7D3C` | Tagline, gold accents |
| `--color-background` | `#FFFFFF` | Main background |
| `--color-background-alt` | `#F5F0F8` | Alternating sections |
| `--color-text` | `#333333` | Body text |
| `--color-text-light` | `#666666` | Secondary text |
| `--color-whatsapp` | `#25D366` | WhatsApp buttons |

### Typography
- **Headings:** Heebo (Google Fonts) — bold/semi-bold
- **Body:** Heebo — regular/light
- **Fallback:** system Hebrew fonts

### Design Principles (from reference sites)
- Clean, spacious layout with generous white space
- Rounded corners on cards and buttons (8-12px radius)
- Subtle box shadows on cards (no harsh borders)
- Sections alternate between white and `--color-background-alt`
- Soft animations on hover (scale, shadow elevation)
- Full-width hero with soft gradient or subtle background image
- Treatment cards: image + title + brief text → links to detail page
- Mobile-first responsive design

### Layout Patterns

**Home Page:**
```
┌─────────────────────────────────────────────┐
│ NAVBAR: Logo (right/RTL) | Links (left)     │
├─────────────────────────────────────────────┤
│ HERO: Full-width, name + tagline + CTA      │
│ Soft lavender gradient background           │
├─────────────────────────────────────────────┤
│ TREATMENTS: "השירותים שלי"                   │
│ 2-3 cards per row (image, title, excerpt)   │
│ Each card links to /treatments/:slug        │
├─────────────────────────────────────────────┤
│ ABOUT PREVIEW: Photo + short bio + "עוד"    │
│ (alternating BG section)                    │
├─────────────────────────────────────────────┤
│ BLOG HIGHLIGHTS: 2-3 latest post cards      │
├─────────────────────────────────────────────┤
│ FOOTER: Contact, WhatsApp, social, nav      │
└─────────────────────────────────────────────┘
```

**Treatment Detail Page:**
```
┌─────────────────────────────────────────────┐
│ HERO IMAGE (treatment-specific)             │
├─────────────────────────────────────────────┤
│ TITLE + PRICE                               │
├─────────────────────────────────────────────┤
│ DESCRIPTION (rich text from admin)          │
├─────────────────────────────────────────────┤
│ WhatsApp CTA BUTTON (full-width, sticky)    │
│ "לתיאום טיפול בוואטסאפ"                      │
└─────────────────────────────────────────────┘
```

---

## 7. Internationalization (i18n)

### Strategy
- **Static UI strings:** Transloco with JSON translation files (`/assets/i18n/he.json`, `/assets/i18n/en.json`)
- **Dynamic content:** Locale-per-record in database. Each entity has a `locale` field.
- **URL structure:** `/he/treatments/healing` vs `/en/treatments/healing` (future)
- **RTL:** Global `dir="rtl"` on `<html>`, CSS logical properties throughout
- **Default locale:** Hebrew (`he`)
- **Zero hardcoded strings** in templates — all text via translation keys

### Implementation Notes
- Angular `DOCUMENT` token used for SSR-safe `dir` attribute
- CSS uses `margin-inline-start/end` instead of `margin-left/right`
- Transloco scope per feature module for lazy-loaded translations
- Locale resolved from URL prefix (future) or query param (now)

---

## 8. Security & Future-Proofing

### Current Security
- Admin JWT auth with bcrypt password hashing
- Rate limiting on public POST endpoints (comments)
- Honeypot spam prevention
- Input validation on all endpoints (express-validator or zod)
- CORS configured for frontend origin only
- Helmet.js for security headers

### Future Payment Integration
- Clean service layer allows adding a `BookingService` + `PaymentService`
- Treatment model can gain a `Booking` relation without schema migration of Treatment itself
- JWT infrastructure already supports adding user roles

### Future User Registration
- Add `User` model with role-based access
- Extend JWT to carry user roles
- Comments can optionally link to registered users
- Admin panel already has auth patterns to follow

---

## 9. Deferred Items (to address during implementation)

These were identified in the design review and will be addressed during development:

- Song unique constraint on `(title, locale)` — included in schema above ✓
- Lecture slug for future detail pages — included in schema above ✓
- Content upsert semantics — admin PUT uses Prisma `upsert` ✓
- Image optimization pipeline (resize/compress on upload)
- SEO meta tags per page (title, description, OG tags)
- Sitemap.xml generation
- 404 / error pages styling

---

## 10. Reference Sites

- **https://sima-shabat.co.il/** — Card layout for services, clean Hebrew typography, personal branding
- **https://everest-shamaim.co.il/** — Service cards with images linking to detail pages, alternating section backgrounds, testimonials grid, process timeline
