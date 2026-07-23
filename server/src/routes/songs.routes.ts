import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginationSchema } from "../utils/pagination.js";
import * as songService from "../services/songs.service.js";
import { ValidationError } from "../errors/application-error.js";
import { httpUrlSchema, localeSchema } from "../utils/content-contracts.js";
import { emitAdminMutation } from "../middleware/security-events.js";

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
  locale: localeSchema.default("he"),
  imageUrl: httpUrlSchema,
  sortOrder: z.number().int().optional(),
});

songRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const song = await songService.createSong(createSchema.parse(req.body));
  emitAdminMutation(req, {
    action: "create",
    resourceType: "song",
    resourceId: String(song.id),
  });
  res.status(201).json(song);
});

const patchSchema = z.object({
  imageUrl: httpUrlSchema.optional(),
  sortOrder: z.number().int().optional(),
});

songRoutes.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  const song = await songService.updateSong(id, patchSchema.parse(req.body));
  emitAdminMutation(req, {
    action: "update",
    resourceType: "song",
    resourceId: String(song.id),
  });
  res.json(song);
});

songRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) throw new ValidationError("Invalid ID");
  await songService.deleteSong(id);
  emitAdminMutation(req, {
    action: "delete",
    resourceType: "song",
    resourceId: String(id),
  });
  res.status(204).end();
});
