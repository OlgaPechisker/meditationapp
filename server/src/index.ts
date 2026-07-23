import express from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import { resolve } from "node:path";
import { config, uploadConfig } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { localeMiddleware } from "./middleware/locale.js";
import { requireAuth } from "./middleware/auth.js";
import { clearRateLimitStore } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { requestLogger, logger } from "./middleware/logger.js";
import { routeContext } from "./middleware/route-context.js";
import { serveVerifiedLocalUploads } from "./middleware/verified-local-upload.js";
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
app.disable("x-powered-by");

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    callback(null, !origin || config.ALLOWED_ORIGINS.includes(origin));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type", "Accept-Language"],
  credentials: false,
};

app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  strictTransportSecurity: config.HSTS_ENABLED ? undefined : false,
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use(localeMiddleware);

if (uploadConfig.STORAGE_PROVIDER === "local") {
  app.use(
    "/uploads",
    serveVerifiedLocalUploads(resolve(uploadConfig.UPLOAD_DIR), uploadConfig.MAX_FILE_SIZE_BYTES),
  );
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
