import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as treatmentService from "../services/treatments.service.js";
import { richTextSchema } from "../utils/rich-text.js";
import { NotFoundError, ValidationError } from "../errors/application-error.js";

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
  if (!treatment) throw new NotFoundError();
  res.json(treatment);
});

const createSchema = z.object({
  slug: z.string().min(1), locale: z.string().default("he"), title: z.string().min(1),
  subtitle: z.string().optional(), description: richTextSchema,
  price: z.preprocess(v => (v === '' || v === 0 || v == null) ? undefined : String(v), z.string().optional()),
  imageUrl: z.preprocess(v => v === '' ? undefined : v, z.string().url().optional()),
  sortOrder: z.number().int().optional(), isActive: z.boolean().optional(),
}).strict();

treatmentRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const treatment = await treatmentService.createTreatment(createSchema.parse(req.body));
  res.status(201).json(treatment);
});

const patchSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  description: richTextSchema.optional(),
  price: z.preprocess(v => (v === '' || v === 0 || v == null) ? undefined : String(v), z.string().optional()),
  imageUrl: z.preprocess(v => v === '' ? undefined : v, z.string().url().optional()),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
}).strict();

treatmentRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  const treatment = await treatmentService.updateTreatment(id, patchSchema.parse(req.body));
  res.json(treatment);
});

treatmentRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  await treatmentService.deleteTreatment(id);
  res.status(204).end();
});
