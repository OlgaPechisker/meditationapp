import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as contentService from "../services/content.service.js";
import { validateRichText } from "../utils/rich-text.js";

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
  if (!content) { res.status(404).json({ error: "Not found" }); return; }
  res.json(content);
});

const upsertSchema = z.object({
  key: z.string().min(1),
  locale: z.string().default("he"),
  value: z.string().min(1),
}).strict();

contentRoutes.put("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  let value = parsed.data.value;
  if (parsed.data.key === "about") {
    try {
      value = validateRichText(value);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid rich text" });
      return;
    }
  }
  const content = await contentService.upsertContent(parsed.data.key, parsed.data.locale, value);
  res.json(content);
});
