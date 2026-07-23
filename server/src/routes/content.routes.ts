import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as contentService from "../services/content.service.js";
import { validateRichText } from "../utils/rich-text.js";
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
  const content = await contentService.getContent(req.params.key as string, req.locale);
  if (!content) throw new NotFoundError();
  res.json(content);
});

const upsertSchema = z.object({
  key: z.string().min(1),
  locale: z.string().default("he"),
  value: z.string().min(1),
}).strict();

contentRoutes.put("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = upsertSchema.parse(req.body);
  let value = parsed.value;
  if (parsed.key === "about") {
    value = validateRichText(value);
  }
  const content = await contentService.upsertContent(parsed.key, parsed.locale, value);
  res.json(content);
});
