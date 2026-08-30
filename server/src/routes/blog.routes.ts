import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as blogService from "../services/blog.service.js";
import { richTextSchema } from "../utils/rich-text.js";
import { youTubeUrlSchema } from "../utils/video.js";
import { NotFoundError, ValidationError } from "../errors/application-error.js";
import {
  boundedPlainTextSchema,
  httpUrlSchema,
  localeSchema,
  slugSchema,
} from "../utils/content-contracts.js";
import { emitAdminMutation } from "../middleware/security-events.js";

export const blogRoutes = Router();

const blogListQuerySchema = paginationSchema.extend({
  search: boundedPlainTextSchema(100, { trim: true }).optional(),
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
  slug: slugSchema, locale: localeSchema.default("he"), title: boundedPlainTextSchema(500),
  excerpt: boundedPlainTextSchema(5_000, { minLength: 0 }).optional(), content: richTextSchema,
  imageUrl: httpUrlSchema.optional(), videoUrl: youTubeUrlSchema.optional(),
  publishedAt: z.coerce.date().optional(),
}).strict();

const patchSchema = z.object({
  slug: slugSchema.optional(),
  title: boundedPlainTextSchema(500).optional(),
  excerpt: boundedPlainTextSchema(5_000, { minLength: 0 }).optional(),
  content: richTextSchema.optional(),
  imageUrl: httpUrlSchema.nullable().optional(),
  videoUrl: youTubeUrlSchema.nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
}).strict();

blogRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const post = await blogService.createPost(createSchema.parse(req.body));
  emitAdminMutation(req, {
    action: "create",
    resourceType: "blog_post",
    resourceId: String(post.id),
  });
  res.status(201).json(post);
});

blogRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  const post = await blogService.updatePost(id, patchSchema.parse(req.body));
  emitAdminMutation(req, {
    action: "update",
    resourceType: "blog_post",
    resourceId: String(post.id),
  });
  res.json(post);
});

blogRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  await blogService.softDeletePost(id);
  emitAdminMutation(req, {
    action: "delete",
    resourceType: "blog_post",
    resourceId: String(id),
  });
  res.status(204).end();
});
