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

lectureRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await lectureService.listAllLectures(req.locale, pagination);
  res.json(result);
});

lectureRoutes.get("/:slug", async (req: Request, res: Response) => {
  const lecture = await lectureService.getLectureBySlug(req.params.slug as string, req.locale);
  if (!lecture) { res.status(404).json({ error: "Not found" }); return; }
  res.json(lecture);
});

const createSchema = z.object({
  slug: z.string().optional(), locale: z.string().default("he"), title: z.string().min(1),
  description: z.string().min(1), date: z.coerce.date(),
  location: z.string().optional(),
  price: z.preprocess(v => (v === '' || v === 0 || v == null) ? undefined : String(v), z.string().optional()),
  imageUrl: z.preprocess(v => v === '' ? undefined : v, z.string().url().optional()),
  isActive: z.boolean().optional(),
});

lectureRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const data = { ...parsed.data } as typeof parsed.data & { slug: string };
  if (!data.slug) {
    data.slug = data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
  }
  const lecture = await lectureService.createLecture(data);
  res.status(201).json(lecture);
});

const patchSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  location: z.string().optional(),
  price: z.preprocess(v => (v === '' || v === 0 || v == null) ? undefined : String(v), z.string().optional()),
  imageUrl: z.preprocess(v => v === '' ? undefined : v, z.string().url().optional()),
  isActive: z.boolean().optional(),
});

lectureRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const lecture = await lectureService.updateLecture(id, parsed.data);
  res.json(lecture);
});

lectureRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await lectureService.deleteLecture(id);
  res.status(204).end();
});
