import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/index.js";
import { generateSlug } from "../src/utils/slug.js";

const LOCALE = "he";

async function login(): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ password: "test-password" });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

function scheduledPayload(overrides: Record<string, unknown> = {}) {
  const future = new Date();
  future.setMonth(future.getMonth() + 1);
  return {
    type: "SCHEDULED",
    slug: `sched-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    locale: LOCALE,
    title: "Scheduled Lecture",
    subtitle: "An evening talk",
    summary: "A short summary of the lecture.",
    description: "<p>Full description of the lecture.</p>",
    audience: "Anyone curious.",
    durationLabel: "90 minutes",
    highlights: ["First point", "Second point"],
    date: future.toISOString(),
    location: "Tel Aviv",
    price: 90,
    ...overrides,
  };
}

function onDemandPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: "ON_DEMAND",
    slug: `ondemand-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    locale: LOCALE,
    title: "On Demand Lecture",
    subtitle: "For groups",
    summary: "A group session summary.",
    description: "<p>Group session description.</p>",
    audience: "Teams and communities.",
    durationLabel: "60-90 minutes",
    highlights: ["Tailored content"],
    location: "At your office or online",
    minimumParticipants: 10,
    ...overrides,
  };
}

describe("Lectures API — validation & contract", () => {
  let token = "";
  const created: number[] = [];

  beforeAll(async () => {
    token = await login();
  });

  afterEach(async () => {
    for (const id of created.splice(0)) {
      await request(app).delete(`/api/lectures/${id}`).set("Authorization", `Bearer ${token}`);
    }
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it("creates a scheduled lecture with structured content", async () => {
    const res = await request(app).post("/api/lectures").set(auth()).send(scheduledPayload());
    expect(res.status).toBe(201);
    created.push(res.body.id);
    expect(res.body.type).toBe("SCHEDULED");
    expect(res.body.date).toBeTruthy();
    expect(res.body.minimumParticipants).toBeNull();
    expect(res.body.highlights).toEqual(["First point", "Second point"]);
    expect(res.body.price).toBe(90);
  });

  it("creates an on-demand lecture without date or price", async () => {
    const res = await request(app).post("/api/lectures").set(auth()).send(onDemandPayload());
    expect(res.status).toBe(201);
    created.push(res.body.id);
    expect(res.body.type).toBe("ON_DEMAND");
    expect(res.body.date).toBeNull();
    expect(res.body.price).toBeNull();
    expect(res.body.minimumParticipants).toBe(10);
  });

  it("rejects a scheduled lecture without a date", async () => {
    const payload = scheduledPayload();
    delete (payload as Record<string, unknown>).date;
    const res = await request(app).post("/api/lectures").set(auth()).send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors).toHaveProperty("date");
  });

  it("rejects an on-demand lecture without minimum participants", async () => {
    const payload = onDemandPayload();
    delete (payload as Record<string, unknown>).minimumParticipants;
    const res = await request(app).post("/api/lectures").set(auth()).send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors).toHaveProperty("minimumParticipants");
  });

  it("rejects an on-demand lecture with minimum participants below 1", async () => {
    const res = await request(app)
      .post("/api/lectures")
      .set(auth())
      .send(onDemandPayload({ minimumParticipants: 0 }));
    expect(res.status).toBe(400);
  });

  it("rejects a scheduled lecture that also sets minimum participants", async () => {
    const res = await request(app)
      .post("/api/lectures")
      .set(auth())
      .send(scheduledPayload({ minimumParticipants: 5 }));
    expect(res.status).toBe(400);
  });

  it("rejects a create payload missing required content fields", async () => {
    const payload = scheduledPayload();
    delete (payload as Record<string, unknown>).subtitle;
    delete (payload as Record<string, unknown>).highlights;
    const res = await request(app).post("/api/lectures").set(auth()).send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors).toHaveProperty("subtitle");
  });

  it("generates a slug when none is provided", async () => {
    const payload = scheduledPayload();
    delete (payload as Record<string, unknown>).slug;
    const res = await request(app).post("/api/lectures").set(auth()).send(payload);
    expect(res.status).toBe(201);
    created.push(res.body.id);
    expect(typeof res.body.slug).toBe("string");
    expect(res.body.slug.length).toBeGreaterThan(0);
  });

  it("replaces an already-used explicit slug", async () => {
    const slug = `duplicate-${Date.now()}`;
    const first = await request(app)
      .post("/api/lectures")
      .set(auth())
      .send(scheduledPayload({ slug }));
    expect(first.status).toBe(201);
    created.push(first.body.id);

    const second = await request(app)
      .post("/api/lectures")
      .set(auth())
      .send(scheduledPayload({ slug }));
    expect(second.status).toBe(201);
    created.push(second.body.id);
    expect(second.body.slug).not.toBe(slug);
  });

  it("returns 409 after repeated generated slug collisions", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const title = "Exhausted slug";
    const collidingSlug = generateSlug(title);

    try {
      const existing = await request(app)
        .post("/api/lectures")
        .set(auth())
        .send(scheduledPayload({ slug: collidingSlug, title }));
      expect(existing.status).toBe(201);
      created.push(existing.body.id);

      const res = await request(app)
        .post("/api/lectures")
        .set(auth())
        .send(scheduledPayload({ slug: "already-used", title }));
      expect(res.status).toBe(201);
      created.push(res.body.id);

      const exhausted = await request(app)
        .post("/api/lectures")
        .set(auth())
        .send(scheduledPayload({ slug: "already-used", title }));
      expect(exhausted.status).toBe(409);
      expect(exhausted.body.error).toContain("slug");
    } finally {
      random.mockRestore();
    }
  });
});

describe("Lectures API — public visibility & ordering", () => {
  let token = "";
  const created: number[] = [];

  beforeAll(async () => {
    token = await login();
  });

  afterEach(async () => {
    for (const id of created.splice(0)) {
      await request(app).delete(`/api/lectures/${id}`).set("Authorization", `Bearer ${token}`);
    }
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  async function create(payload: Record<string, unknown>) {
    const res = await request(app).post("/api/lectures").set(auth()).send(payload);
    expect(res.status).toBe(201);
    created.push(res.body.id);
    return res.body;
  }

  it("excludes past scheduled lectures but includes future scheduled and on-demand", async () => {
    const pastDate = new Date("2020-01-01T00:00:00.000Z").toISOString();
    const past = await create(scheduledPayload({ date: pastDate, title: "Past One" }));
    const future = await create(scheduledPayload({ title: "Future One" }));
    const onDemand = await create(onDemandPayload({ title: "OnDemand One" }));

    const res = await request(app).get("/api/lectures?locale=he&limit=100");
    expect(res.status).toBe(200);
    const ids = res.body.data.map((l: { id: number }) => l.id);
    expect(ids).not.toContain(past.id);
    expect(ids).toContain(future.id);
    expect(ids).toContain(onDemand.id);
  });

  it("orders scheduled (by date) before on-demand (by sortOrder)", async () => {
    const later = new Date();
    later.setMonth(later.getMonth() + 6);
    const sooner = new Date();
    sooner.setMonth(sooner.getMonth() + 1);

    const s2 = await create(scheduledPayload({ date: later.toISOString(), title: "Later Sched" }));
    const s1 = await create(scheduledPayload({ date: sooner.toISOString(), title: "Sooner Sched" }));
    const od = await create(onDemandPayload({ title: "OnDemand Sort", sortOrder: 2 }));

    const res = await request(app).get("/api/lectures?locale=he&limit=100");
    const ids = res.body.data.map((l: { id: number }) => l.id);
    expect(ids.indexOf(s1.id)).toBeLessThan(ids.indexOf(s2.id));
    expect(ids.indexOf(s2.id)).toBeLessThan(ids.indexOf(od.id));
  });

  it("returns 404 for an inactive lecture via public slug lookup", async () => {
    const lecture = await create(scheduledPayload({ isActive: false }));
    const res = await request(app).get(`/api/lectures/${lecture.slug}?locale=he`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for a past scheduled lecture via public slug lookup", async () => {
    const lecture = await create(
      scheduledPayload({ date: new Date("2020-01-01T00:00:00.000Z").toISOString() }),
    );
    const res = await request(app).get(`/api/lectures/${lecture.slug}?locale=he`);
    expect(res.status).toBe(404);
  });

  it("returns an on-demand lecture via public slug lookup", async () => {
    const lecture = await create(onDemandPayload());
    const res = await request(app).get(`/api/lectures/${lecture.slug}?locale=he`);
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("ON_DEMAND");
  });
});

describe("Lectures API — patch merge validation", () => {
  let token = "";
  const created: number[] = [];

  beforeAll(async () => {
    token = await login();
  });

  afterEach(async () => {
    for (const id of created.splice(0)) {
      await request(app).delete(`/api/lectures/${id}`).set("Authorization", `Bearer ${token}`);
    }
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  async function create(payload: Record<string, unknown>) {
    const res = await request(app).post("/api/lectures").set(auth()).send(payload);
    expect(res.status).toBe(201);
    created.push(res.body.id);
    return res.body;
  }

  it("converts a scheduled lecture to on-demand and clears the date", async () => {
    const lecture = await create(scheduledPayload());
    const res = await request(app)
      .patch(`/api/lectures/${lecture.id}`)
      .set(auth())
      .send({ type: "ON_DEMAND", minimumParticipants: 8 });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("ON_DEMAND");
    expect(res.body.date).toBeNull();
    expect(res.body.minimumParticipants).toBe(8);
  });

  it("rejects converting to on-demand without a minimum participant count", async () => {
    const lecture = await create(scheduledPayload());
    const res = await request(app)
      .patch(`/api/lectures/${lecture.id}`)
      .set(auth())
      .send({ type: "ON_DEMAND" });
    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors).toHaveProperty("minimumParticipants");
  });

  it("rejects clearing the date on a scheduled lecture", async () => {
    const lecture = await create(scheduledPayload());
    const res = await request(app)
      .patch(`/api/lectures/${lecture.id}`)
      .set(auth())
      .send({ date: null });
    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors).toHaveProperty("date");
  });

  it("converts an on-demand lecture to scheduled and clears minimum participants", async () => {
    const lecture = await create(onDemandPayload());
    const future = new Date();
    future.setMonth(future.getMonth() + 2);
    const res = await request(app)
      .patch(`/api/lectures/${lecture.id}`)
      .set(auth())
      .send({ type: "SCHEDULED", date: future.toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("SCHEDULED");
    expect(res.body.minimumParticipants).toBeNull();
    expect(res.body.date).toBeTruthy();
  });
});
