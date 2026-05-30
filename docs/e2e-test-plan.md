# Playwright E2E Test Plan — Einat Website & Admin Panel

## Application Overview

Angular SSR + Express/Node + PostgreSQL (Prisma).  
Multi-locale (he / en) via `?locale=` query param or Accept-Language header.  
Single-password JWT auth guards all admin routes.

---

## 1. Authentication

### Positive
| ID | Scenario |
|----|----------|
| AUTH-P1 | Navigate to `/admin/login`, enter correct password → redirect to `/admin/treatments` |
| AUTH-P2 | JWT persisted in localStorage; refresh `/admin` page → stays authenticated |
| AUTH-P3 | Logout clears token → `/admin` redirects to `/admin/login` |

### Negative
| ID | Scenario |
|----|----------|
| AUTH-N1 | Submit empty password → inline validation error, no API call |
| AUTH-N2 | Submit wrong password → server returns 401, error message shown |
| AUTH-N3 | Manually navigate to `/admin/treatments` without token → redirect to `/admin/login` |
| AUTH-N4 | Tampered/expired JWT → 401 on next API call → redirect to `/admin/login` |

### Edge Cases
| ID | Scenario |
|----|----------|
| AUTH-E1 | Password field with only whitespace → treated as empty, rejected |
| AUTH-E2 | Very long password string (500 chars) → graceful error |

---

## 2. Public Website — Treatments

### Positive
| ID | Scenario |
|----|----------|
| TRT-P1 | `/treatments` renders list of active treatments |
| TRT-P2 | Click a treatment card → navigates to `/treatments/:slug`, shows title & description |
| TRT-P3 | Locale switch (he→en) updates treatment content |

### Negative
| ID | Scenario |
|----|----------|
| TRT-N1 | Navigate to `/treatments/non-existent-slug` → 404 page |
| TRT-N2 | Inactive treatments are NOT visible in the public list |

### Edge Cases
| ID | Scenario |
|----|----------|
| TRT-E1 | Treatment with no optional fields (no price, no image, no subtitle) → page still renders |

---

## 3. Public Website — Blog & Comments

### Positive
| ID | Scenario |
|----|----------|
| BLOG-P1 | `/blog` renders list of published posts (excerpt, date) |
| BLOG-P2 | Click post → `/blog/:slug` renders full content |
| BLOG-P3 | Approved comments shown on blog post |
| BLOG-P4 | Submit valid comment (name + content) → success message shown |
| BLOG-P5 | After admin approval, comment appears in the post |
| BLOG-P6 | Future-scheduled post (`publishedAt` = now + 1h) is NOT in public `/blog` list (boundary) |
| BLOG-P7 | Post scheduled exactly at "now" (mocked clock) → IS visible in public list |

### Negative
| ID | Scenario |
|----|----------|
| BLOG-N1 | `/blog/non-existent-slug` → **HTTP 404 status** (SSR) + 404 UI page |
| BLOG-N2 | Submit comment with empty name → validation error |
| BLOG-N3 | Submit comment with empty content → validation error |
| BLOG-N4 | Submit comment with content > 2000 chars → validation error |
| BLOG-N5 | Author name > 100 chars → validation error |
| BLOG-N6 | Unapproved comments NOT visible to public |
| BLOG-N7 | XSS payload in comment content (`<script>alert(1)</script>`) → rendered escaped, no script execution |
| BLOG-N8 | XSS payload in comment author name → rendered escaped |

### Edge Cases
| ID | Scenario |
|----|----------|
| BLOG-E1 | Rate limit: submit 4th comment within 15 min → 429 error shown *(run serially — see §Rate Limit lane)* |
| BLOG-E2 | Rate limit window resets after 15 min → can submit again (use mocked clock or wait) |
| BLOG-E3 | Rate limit is per-IP: two different IPs can each submit 3 comments independently |
| BLOG-E4 | Honeypot field filled → silently accepted (201) but comment not persisted |
| BLOG-E5 | Draft/deleted post URL → **HTTP 404 status** (SSR) + 404 UI page |
| BLOG-E6 | Post with no comments → "no comments yet" state shown |

---

## 4. Public Website — Lectures

### Positive
| ID | Scenario |
|----|----------|
| LEC-P1 | `/lectures` shows only upcoming (future-dated) active lectures |
| LEC-P2 | Lecture cards show title, date, location, price |

### Negative
| ID | Scenario |
|----|----------|
| LEC-N1 | Past/inactive lectures not shown |

### Edge Cases
| ID | Scenario |
|----|----------|
| LEC-E1 | Lecture with `date` = exactly now (mocked clock) → boundary: treated as past, NOT shown |
| LEC-E2 | Lecture with `date` = now + 1 min (mocked clock) → shown as upcoming |

---

## 5. Public Website — Songs

### Positive
| ID | Scenario |
|----|----------|
| SONG-P1 | `/songs` renders all songs sorted by sortOrder |
| SONG-P2 | Each song shows title and full lyrics |

---

## 6. Public Website — Navigation & Pages

### Positive
| ID | Scenario |
|----|----------|
| NAV-P1 | Home page loads with site content blocks populated |
| NAV-P2 | Nav links (Treatments, Blog, Lectures, Songs, About, Contact) all navigate correctly |
| NAV-P3 | Contact page renders |
| NAV-P4 | About page renders |

### Negative / Edge Cases
| ID | Scenario |
|----|----------|
| NAV-N1 | Completely unknown route → **HTTP 404 status** (SSR) + 404 Not Found UI |
| NAV-E1 | Locale `?locale=xx` (unsupported) → falls back to `he` |
| NAV-E2 | Locale via `Accept-Language: en` header (no query param) → content served in `en` |
| NAV-E3 | Both `?locale=he` query param and `Accept-Language: en` header present → query param wins, serves `he` |

---

## 7. Admin — Treatments CRUD

### Positive
| ID | Scenario |
|----|----------|
| ATRT-P1 | Load `/admin/treatments` → table lists all treatments (including inactive) |
| ATRT-P2 | Create new treatment (all required fields) → appears in list |
| ATRT-P3 | Edit treatment title → change reflected in list and public page |
| ATRT-P4 | Toggle `isActive` off → treatment disappears from public list |
| ATRT-P5 | Fill all optional fields (subtitle, price, imageUrl, sortOrder) → saved correctly |

### Negative
| ID | Scenario |
|----|----------|
| ATRT-N1 | Create treatment with empty slug → validation error |
| ATRT-N2 | Create treatment with duplicate slug+locale → server 4xx, error shown |
| ATRT-N3 | imageUrl that is not a valid URL → validation error |

---

## 8. Admin — Blog CRUD

### Positive
| ID | Scenario |
|----|----------|
| ABLOG-P1 | Load `/admin/blog` → all posts shown (including drafts/deleted) |
| ABLOG-P2 | Create blog post without publishedAt → saved as draft, NOT in public list |
| ABLOG-P3 | Create blog post with publishedAt = now → appears in public `/blog` |
| ABLOG-P4 | Edit post → updates reflected on public page |
| ABLOG-P5 | Delete post → soft-deleted; no longer in public list; still visible in admin list |

### Negative
| ID | Scenario |
|----|----------|
| ABLOG-N1 | Create post with empty title → validation error |
| ABLOG-N2 | Create post with empty content → validation error |
| ABLOG-N3 | Create post with duplicate slug+locale → server 4xx, error shown |

---

## 9. Admin — Comments Moderation

### Positive
| ID | Scenario |
|----|----------|
| ACMT-P1 | `/admin/comments` lists pending (unapproved) comments |
| ACMT-P2 | Approve comment → moves off pending list, appears on public blog post |
| ACMT-P3 | Delete comment → removed from pending list |

### Negative
| ID | Scenario |
|----|----------|
| ACMT-N1 | Approve non-existent comment ID → error handled gracefully |
| ACMT-N2 | Unauthenticated request to `/api/comments/admin/pending` → 401 |

---

## 10. Admin — Lectures CRUD

### Positive
| ID | Scenario |
|----|----------|
| ALEC-P1 | Load `/admin/lectures` → all lectures listed |
| ALEC-P2 | Create lecture with required fields (including date) → appears in list |
| ALEC-P3 | Set future date → lecture visible in public `/lectures` |
| ALEC-P4 | Set past date → lecture NOT shown on public page |
| ALEC-P5 | Update lecture → public page reflects change |

### Negative
| ID | Scenario |
|----|----------|
| ALEC-N1 | Create lecture with no date → validation error |
| ALEC-N2 | imageUrl that is not valid URL → validation error |

---

## 11. Admin — Songs CRUD

### Positive
| ID | Scenario |
|----|----------|
| ASON-P1 | Load `/admin/songs` → all songs listed |
| ASON-P2 | Create song (title + lyrics) → appears on public `/songs` |
| ASON-P3 | Update song lyrics → reflected on public page |
| ASON-P4 | Delete song → no longer on public `/songs` |
| ASON-P5 | sortOrder is respected on public page |

### Negative
| ID | Scenario |
|----|----------|
| ASON-N1 | Create song with empty title → validation error |
| ASON-N2 | Create song with duplicate title+locale → server 4xx, error shown |

---

## 12. Admin — Site Content Management

### Positive
| ID | Scenario |
|----|----------|
| ACNT-P1 | Load `/admin/content` → list of content keys shown |
| ACNT-P2 | Update a content value → new value reflected on public home/about pages |
| ACNT-P3 | Upsert creates new key if it doesn't exist |

### Negative
| ID | Scenario |
|----|----------|
| ACNT-N1 | Update with empty value → validation error |

---

## 13. Cross-Cutting / Security

| ID | Scenario |
|----|----------|
| SEC-1 | All admin API endpoints return 401 without Bearer token |
| SEC-2 | Bearer token with wrong signature → 401 |
| SEC-3 | Comment rate limit: >3 per 15 min from same IP → 429 *(serial lane)* |
| SEC-4 | Honeypot: comment with honeypot field filled → 201 but not stored |
| SEC-5 | XSS in blog post content (via admin create) → rendered escaped on public page, no script execution |
| SEC-6 | SSR unknown routes return real HTTP 404 (verified via `page.goto()` response status) |
| SEC-7 | SSR draft/deleted blog post URL returns real HTTP 404 |

---

## 14. Implementation Notes

### Data Isolation
- ❌ ~~"Seed DB before each test suite"~~ — too coarse; causes data collisions in parallel runs
- ✅ **Per-test factory helpers**: each test creates its own entities via API calls in `beforeEach`, cleans up in `afterEach`
- Use a dedicated **test database** (separate `DATABASE_URL` in `.env.test`)
- Provide a `createEntity` helper module (`e2e/fixtures/factory.ts`) wrapping API calls to create treatments, posts, lectures, songs, comments

### Auth
- ❌ ~~Ad-hoc localStorage manipulation~~ — brittle and bypasses real login flow
- ✅ Use Playwright **`storageState`**: call the real `/api/auth/login` endpoint once, save state to `e2e/.auth/admin.json`, reuse via `use: { storageState }` in `playwright.config.ts`

### Time-Dependent Tests
- All tests touching `publishedAt`, `date` (lectures), or rate-limit windows must not rely on wall-clock time
- ✅ Inject a **clock override** via `page.clock.install({ time: fixedTimestamp })` (Playwright 1.45+) for browser-side time
- ✅ For server-side time gating (publishedAt, lecture date filtering): seed data with explicit past/future timestamps relative to a fixed anchor, not `Date.now()`

### Rate Limit Tests
- ❌ ~~Run in parallel with other tests~~ — in-memory rate-limiter state is shared; parallel workers corrupt counts
- ✅ Create a **dedicated Playwright project** (`rateLimit`) with `workers: 1` and `fullyParallel: false`
- ✅ Or expose a `TEST_MODE=true` env flag that resets the rate-limit store between requests (server-side test hook)

### SSR Status Codes
- All "→ 404 page" assertions must also assert `const response = await page.goto(url); expect(response?.status()).toBe(404)`

### Locale
- Locale header tests must be exercised at the API level (using Playwright `request` fixture) since Angular SPA routing cannot set `Accept-Language`
- For header-vs-query precedence tests, use `request.get('/api/treatments', { headers: { 'Accept-Language': 'en' } })` alongside `?locale=he`

### Selectors
- Use `data-testid` attributes; avoid CSS class selectors
- No mocking for E2E — tests hit the real test DB and real API

### File Structure
```
e2e/
  playwright.config.ts          ← defines projects: default (parallel), rateLimit (serial, workers:1)
  .auth/
    admin.json                  ← saved storageState from real login
  fixtures/
    auth.fixture.ts             ← loginAsAdmin() using real API + storageState
    factory.ts                  ← createTreatment(), createPost(), createComment(), etc.
    clock.ts                    ← Playwright clock helpers
  public/
    treatments.spec.ts
    blog.spec.ts
    lectures.spec.ts
    songs.spec.ts
    navigation.spec.ts
    locale.spec.ts              ← Accept-Language + query param precedence
  admin/
    treatments.spec.ts
    blog.spec.ts
    comments.spec.ts
    lectures.spec.ts
    songs.spec.ts
    content.spec.ts
  security.spec.ts              ← SEC-1..7 + XSS
  rate-limit.spec.ts            ← BLOG-E1..E3 (serial project only)
```
