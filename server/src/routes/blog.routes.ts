import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as blogService from "../services/blog.service.js";
import { richTextSchema } from "../utils/rich-text.js";
import { youTubeUrlSchema } from "../utils/video.js";

export const blogRoutes = Router();

const blogListQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(100).optional(),
});

blogRoutes.get("/", async (req: Request, res: Response) => {
  const query = blogListQuerySchema.parse(req.query);
  const result = await blogService.listPublishedPosts(req.locale, query);
  res.json(result);
});

blogRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await blogService.listAllPosts(req.locale, pagination);
  res.json(result);
});

blogRoutes.get("/:slug", async (req: Request, res: Response) => {
  const post = await blogService.getPostBySlug(req.params.slug as string, req.locale);
  if (!post) { res.status(404).json({ error: "Not found" }); return; }
  res.json(post);
});

const createSchema = z.object({
  slug: z.string().min(1), locale: z.string().default("he"), title: z.string().min(1),
  excerpt: z.string().optional(), content: richTextSchema,
  imageUrl: z.string().url().optional(), videoUrl: youTubeUrlSchema.optional(),
  publishedAt: z.coerce.date().optional(),
}).strict();

const patchSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  content: richTextSchema.optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: youTubeUrlSchema.nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
}).strict();

blogRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const post = await blogService.createPost(parsed.data);
  res.status(201).json(post);
});

blogRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const post = await blogService.updatePost(id, parsed.data);
  res.json(post);
});

blogRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await blogService.softDeletePost(id);
  res.status(204).end();
});
