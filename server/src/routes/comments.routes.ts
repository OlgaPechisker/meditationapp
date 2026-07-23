import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { paginationSchema } from "../utils/pagination.js";
import * as commentService from "../services/comments.service.js";
import { ValidationError } from "../errors/application-error.js";

export const commentRoutes = Router();

commentRoutes.get("/post/:postId", async (req: Request, res: Response) => {
  const postId = parseInt(req.params.postId as string);
  if (isNaN(postId)) throw new ValidationError("Invalid post ID");
  const pagination = paginationSchema.parse(req.query);
  const result = await commentService.listApprovedComments(postId, pagination);
  res.json(result);
});

const createCommentSchema = z.object({
  postId: z.number().int().positive(),
  authorName: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  honeypot: z.string().optional(),
});

commentRoutes.post("/",
  (req: Request, res: Response, next) => {
    if (req.body?.honeypot) { res.status(201).json({ message: "Comment submitted" }); return; }
    next();
  },
  rateLimit(3, 15 * 60 * 1000),
  async (req: Request, res: Response) => {
    const { honeypot: _hp, ...data } = createCommentSchema.parse(req.body);
    const comment = await commentService.createComment(data);
    res.status(201).json(comment);
  }
);

commentRoutes.post("/admin/create", requireAuth, async (req: Request, res: Response) => {
  const { honeypot, ...data } = createCommentSchema.parse(req.body);
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
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  const comment = await commentService.approveComment(id);
  res.json(comment);
});

commentRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  await commentService.deleteComment(id);
  res.status(204).end();
});
