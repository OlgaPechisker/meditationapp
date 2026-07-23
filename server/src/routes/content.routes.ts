import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as contentService from "../services/content.service.js";
import {
  siteContentKeySchema,
  validateSiteContentValue,
} from "../utils/site-content.js";
import { localeSchema } from "../utils/content-contracts.js";
import { NotFoundError } from "../errors/application-error.js";

export const contentRoutes = Router();

contentRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await contentService.getAllContentPaginated(req.locale, pagination);
  res.json(result);
});

contentRoutes.get("/", async (req: Request, res: Response) => {
  const result = await contentService.getAllContent(req.locale);
  res.json(result);
});

contentRoutes.get("/:key", async (req: Request, res: Response) => {
  const parsedKey = siteContentKeySchema.safeParse(req.params.key);
  if (!parsedKey.success) throw new NotFoundError();
  const content = await contentService.getContent(parsedKey.data, req.locale);
  if (!content) throw new NotFoundError();
  res.json(content);
});

const upsertSchema = z.object({
  key: siteContentKeySchema,
  locale: localeSchema.default("he"),
  value: z.string().min(1),
}).strict();

contentRoutes.put("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = upsertSchema.parse(req.body);
  const value = validateSiteContentValue(parsed.key, parsed.value);
  const content = await contentService.upsertContent(parsed.key, parsed.locale, value);
  res.json(content);
});
