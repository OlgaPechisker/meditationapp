import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as treatmentService from "../services/treatments.service.js";

export const treatmentRoutes = Router();

treatmentRoutes.get("/", async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await treatmentService.listTreatments(req.locale, pagination);
  res.json(result);
});

treatmentRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await treatmentService.listAllTreatments(req.locale, pagination);
  res.json(result);
});

treatmentRoutes.get("/:slug", async (req: Request, res: Response) => {
  const treatment = await treatmentService.getTreatmentBySlug(req.params.slug as string, req.locale);
  if (!treatment) { res.status(404).json({ error: "Not found" }); return; }
  res.json(treatment);
});

const createSchema = z.object({
  slug: z.string().min(1), locale: z.string().default("he"), title: z.string().min(1),
  subtitle: z.string().optional(), description: z.string().min(1),
  price: z.preprocess(v => (v === '' || v === 0 || v == null) ? undefined : String(v), z.string().optional()),
  imageUrl: z.preprocess(v => v === '' ? undefined : v, z.string().url().optional()),
  sortOrder: z.number().int().optional(), isActive: z.boolean().optional(),
});

treatmentRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const treatment = await treatmentService.createTreatment(parsed.data);
  res.status(201).json(treatment);
});

const patchSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.preprocess(v => (v === '' || v === 0 || v == null) ? undefined : String(v), z.string().optional()),
  imageUrl: z.preprocess(v => v === '' ? undefined : v, z.string().url().optional()),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

treatmentRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const treatment = await treatmentService.updateTreatment(id, parsed.data);
  res.json(treatment);
});

treatmentRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await treatmentService.deleteTreatment(id);
  res.status(204).end();
});
