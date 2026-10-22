import "dotenv/config";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import { sessionMiddleware } from "./config/session.js";
import authRoutes from "./routes/authRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5500";

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(
  express.static(fileURLToPath(new URL("../../frontend", import.meta.url))),
);

app.use(sessionMiddleware);

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", financeRoutes);

app.use(errorHandler);

export default app;
