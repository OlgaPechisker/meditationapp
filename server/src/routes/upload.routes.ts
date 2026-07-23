import { Router, Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { storageProvider } from "../services/storage/index.js";
import { uploadConfig } from "../config.js";
import { ValidationError } from "../errors/application-error.js";
import { inspectVerifiedImage } from "../utils/verified-image.js";

export const uploadRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadConfig.MAX_FILE_SIZE_BYTES },
});

uploadRoutes.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidationError("Invalid upload");
    }

    const image = await inspectVerifiedImage(req.file.buffer);
    if (!image || req.file.mimetype.trim().toLowerCase() !== image.contentType) {
      throw new ValidationError("Invalid upload");
    }

    const filename = `${randomUUID()}.${image.extension}`;
    const url = await storageProvider.upload(req.file.buffer, {
      filename,
      contentType: image.contentType,
    });
    res.status(201).json({ url });
  }
);
