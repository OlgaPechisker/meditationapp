import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as blogService from "../services/blog.service.js";
import { richTextSchema } from "../utils/rich-text.js";
import { youTubeUrlSchema } from "../utils/video.js";
import { NotFoundError, ValidationError } from "../errors/application-error.js";

export const blogRoutes = Router();

const blogListQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(100).optional(),
});

blogRoutes.get("/", async (req: Request, res: Response) => {
  const result = await blogService.listPublishedPosts(req.locale, blogListQuerySchema.parse(req.query));
  res.json(result);
});

blogRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await blogService.listAllPosts(req.locale, pagination);
  res.json(result);
});

blogRoutes.get("/:slug", async (req: Request, res: Response) => {
  const post = await blogService.getPostBySlug(req.params.slug as string, req.locale);
  if (!post) throw new NotFoundError();
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
  imageUrl: z.string().url().nullable().optional(),
  videoUrl: youTubeUrlSchema.nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
}).strict();

blogRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const post = await blogService.createPost(createSchema.parse(req.body));
  res.status(201).json(post);
});

blogRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  const post = await blogService.updatePost(id, patchSchema.parse(req.body));
  res.json(post);
});

blogRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  await blogService.softDeletePost(id);
  res.status(204).end();
});
