import "dotenv/config";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { localeMiddleware } from "./middleware/locale.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(localeMiddleware);

// Routes will be added in Phase 4
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
  });
}

export { app };
