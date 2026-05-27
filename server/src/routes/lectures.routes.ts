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
  slug: z.string().min(1), locale: z.string().default("he"), title: z.string().min(1),
  description: z.string().min(1), date: z.coerce.date(),
  location: z.string().optional(), price: z.string().optional(), imageUrl: z.string().url().optional(),
});

lectureRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const lecture = await lectureService.createLecture(parsed.data);
  res.status(201).json(lecture);
});

lectureRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const lecture = await lectureService.updateLecture(id, req.body);
  res.json(lecture);
});
