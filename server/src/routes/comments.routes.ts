import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { paginationSchema } from "../utils/pagination.js";
import * as commentService from "../services/comments.service.js";

export const commentRoutes = Router();

commentRoutes.get("/post/:postId", async (req: Request, res: Response) => {
  const postId = parseInt(req.params.postId as string);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post ID" }); return; }
  const pagination = paginationSchema.parse(req.query);
  const result = await commentService.listApprovedComments(postId, pagination);
  res.json(result);
});

const createCommentSchema = z.object({
  postId: z.number().int().positive(),
  authorName: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  honeypot: z.string().max(0).optional(),
});

commentRoutes.post("/", rateLimit(3, 15 * 60 * 1000), async (req: Request, res: Response) => {
  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { honeypot, ...data } = parsed.data;
  // If honeypot has content, silently accept but don't save
  if (honeypot && honeypot.length > 0) { res.status(201).json({ message: "Comment submitted" }); return; }
  const comment = await commentService.createComment(data);
  res.status(201).json(comment);
});

commentRoutes.get("/admin/pending", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await commentService.listPendingComments(pagination);
  res.json(result);
});

commentRoutes.patch("/:id/approve", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const comment = await commentService.approveComment(id);
  res.json(comment);
});

commentRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await commentService.deleteComment(id);
  res.status(204).end();
});
