import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as songService from "../services/songs.service.js";
import { ValidationError } from "../errors/application-error.js";

export const songRoutes = Router();

songRoutes.get("/admin/all", requireAuth, async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await songService.listAllSongs(req.locale, pagination);
  res.json(result);
});

songRoutes.get("/", async (req: Request, res: Response) => {
  const pagination = paginationSchema.parse(req.query);
  const result = await songService.listSongs(req.locale, pagination);
  res.json(result);
});

const createSchema = z.object({
  locale: z.string().default("he"),
  imageUrl: z.string().url(),
  sortOrder: z.number().int().optional(),
});

songRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const song = await songService.createSong(createSchema.parse(req.body));
  res.status(201).json(song);
});

const patchSchema = z.object({
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});

songRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  const song = await songService.updateSong(id, patchSchema.parse(req.body));
  res.json(song);
});

songRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  await songService.deleteSong(id);
  res.status(204).end();
});
