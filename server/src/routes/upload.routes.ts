import { Router, Request, Response } from "express";
import multer from "multer";
import { extname } from "node:path";
import { requireAuth } from "../middleware/auth.js";
import { storageProvider } from "../services/storage/index.js";
import { uploadConfig } from "../config.js";

export const uploadRoutes = Router();

const ALLOWED_MIMETYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadConfig.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpeg, png, webp, gif)"));
    }
  },
});

uploadRoutes.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const ext = extname(req.file.originalname).toLowerCase() || ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const url = await storageProvider.upload(req.file.buffer, filename, req.file.mimetype);
    res.status(201).json({ url });
  }
);
