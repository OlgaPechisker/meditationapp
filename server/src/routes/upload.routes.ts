import { Router, Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { storageProvider } from "../services/storage/index.js";
import { uploadConfig } from "../config.js";
import { UploadValidationError } from "../errors/application-error.js";
import { inspectVerifiedImage } from "../utils/verified-image.js";
import { emitAdminMutation } from "../middleware/security-events.js";

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
      throw new UploadValidationError();
    }

    const image = await inspectVerifiedImage(req.file.buffer);
    if (!image || req.file.mimetype.trim().toLowerCase() !== image.contentType) {
      throw new UploadValidationError();
    }

    const filename = `${randomUUID()}.${image.extension}`;
    const url = await storageProvider.upload(req.file.buffer, {
      filename,
      contentType: image.contentType,
    });
    emitAdminMutation(req, {
      action: "upload",
      resourceType: "upload",
      resourceId: filename,
    });
    res.status(201).json({ url });
  }
);
