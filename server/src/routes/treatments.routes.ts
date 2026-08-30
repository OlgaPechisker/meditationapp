import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as treatmentService from "../services/treatments.service.js";
import { richTextSchema } from "../utils/rich-text.js";
import { NotFoundError, ValidationError } from "../errors/application-error.js";
import {
  boundedPlainTextSchema,
  httpUrlSchema,
  localeSchema,
  slugSchema,
} from "../utils/content-contracts.js";
import { emitAdminMutation } from "../middleware/security-events.js";

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
  slug: slugSchema, locale: localeSchema.default("he"), title: boundedPlainTextSchema(500),
  subtitle: boundedPlainTextSchema(1_000, { minLength: 0 }).optional(), description: richTextSchema,
  price: z.preprocess(v => (v === '' || v === 0 || v == null) ? undefined : String(v), boundedPlainTextSchema(100).optional()),
  imageUrl: z.preprocess(v => v === '' ? undefined : v, httpUrlSchema.optional()),
  sortOrder: z.number().int().optional(), isActive: z.boolean().optional(),
}).strict();

treatmentRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const treatment = await treatmentService.createTreatment(createSchema.parse(req.body));
  emitAdminMutation(req, {
    action: "create",
    resourceType: "treatment",
    resourceId: String(treatment.id),
  });
  res.status(201).json(treatment);
});

const patchSchema = z.object({
  slug: boundedPlainTextSchema(200, { minLength: 0 }).optional(),
  title: boundedPlainTextSchema(500).optional(),
  subtitle: boundedPlainTextSchema(1_000, { minLength: 0 }).optional(),
  description: richTextSchema.optional(),
  price: z.preprocess(v => (v === '' || v === 0 || v == null) ? undefined : String(v), boundedPlainTextSchema(100).optional()),
  imageUrl: z.preprocess(v => v === '' ? undefined : v, httpUrlSchema.optional()),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
}).strict();

treatmentRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  const treatment = await treatmentService.updateTreatment(id, patchSchema.parse(req.body));
  emitAdminMutation(req, {
    action: "update",
    resourceType: "treatment",
    resourceId: String(treatment.id),
  });
  res.json(treatment);
});

treatmentRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  await treatmentService.deleteTreatment(id);
  emitAdminMutation(req, {
    action: "delete",
    resourceType: "treatment",
    resourceId: String(id),
  });
  res.status(204).end();
});
