import express from "express";
import cors from "cors";
import { resolve } from "node:path";
import { config, uploadConfig } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { localeMiddleware } from "./middleware/locale.js";
import { requireAuth } from "./middleware/auth.js";
import { clearRateLimitStore } from "./middleware/rate-limit.js";
import { authRoutes } from "./routes/auth.routes.js";
import { treatmentRoutes } from "./routes/treatments.routes.js";
import { blogRoutes } from "./routes/blog.routes.js";
import { commentRoutes } from "./routes/comments.routes.js";
import { lectureRoutes } from "./routes/lectures.routes.js";
import { songRoutes } from "./routes/songs.routes.js";
import { contentRoutes } from "./routes/content.routes.js";
import { uploadRoutes } from "./routes/upload.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(localeMiddleware);

if (uploadConfig.STORAGE_PROVIDER === "local") {
  app.use("/uploads", express.static(resolve(uploadConfig.UPLOAD_DIR)));
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/lectures", lectureRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/upload", uploadRoutes);

if (process.env.NODE_ENV !== "production") {
  app.delete("/api/_test/rate-limit", requireAuth, (_req, res) => {
    clearRateLimitStore();
    res.status(204).end();
  });
}

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
  });
}

export { app };
