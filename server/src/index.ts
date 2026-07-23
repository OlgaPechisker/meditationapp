import express from "express";
import cors from "cors";
import { resolve } from "node:path";
import { config, uploadConfig } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { localeMiddleware } from "./middleware/locale.js";
import { requireAuth } from "./middleware/auth.js";
import { clearRateLimitStore } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { requestLogger, logger } from "./middleware/logger.js";
import { routeContext } from "./middleware/route-context.js";
import { authRoutes } from "./routes/auth.routes.js";
import { treatmentRoutes } from "./routes/treatments.routes.js";
import { blogRoutes } from "./routes/blog.routes.js";
import { commentRoutes } from "./routes/comments.routes.js";
import { lectureRoutes } from "./routes/lectures.routes.js";
import { songRoutes } from "./routes/songs.routes.js";
import { contentRoutes } from "./routes/content.routes.js";
import { uploadRoutes } from "./routes/upload.routes.js";

const app = express();

app.set("trust proxy", 1);

app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(cors());
app.use(express.json());
app.use(localeMiddleware);

if (uploadConfig.STORAGE_PROVIDER === "local") {
  app.use("/uploads", express.static(resolve(uploadConfig.UPLOAD_DIR)));
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", routeContext("/api/auth"), authRoutes);
app.use("/api/treatments", routeContext("/api/treatments"), treatmentRoutes);
app.use("/api/blog", routeContext("/api/blog"), blogRoutes);
app.use("/api/comments", routeContext("/api/comments"), commentRoutes);
app.use("/api/lectures", routeContext("/api/lectures"), lectureRoutes);
app.use("/api/songs", routeContext("/api/songs"), songRoutes);
app.use("/api/content", routeContext("/api/content"), contentRoutes);
app.use("/api/upload", routeContext("/api/upload"), uploadRoutes);

if (process.env.NODE_ENV !== "production") {
  app.delete("/api/_test/rate-limit", requireAuth, (_req, res) => {
    clearRateLimitStore();
    res.status(204).end();
  });
}

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "server listening");
  });
}

export { app };
