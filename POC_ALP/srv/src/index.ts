import express, { Express, Request, Response } from "express";
import config from "./config/app.config";
import datasphereRoutes from "./routes/datasphere.routes";
import { logger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { InternalServerError } from "./errors/http.errors";
import logging from "cf-nodejs-logging-support";


const app: Express = express();

// Initialize CF logging with request tracking
app.use((req, res, next) => {
  logging.logNetwork(req, res, next);
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Routes
app.use("/datasphere", datasphereRoutes);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Start server
const port = config.server.port;
app.listen(port, () => {
  logger.info("Server started", { port });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception", error, {
    type: "UNCAUGHT_EXCEPTION",
    processId: process.pid,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: any) => {
  const error = reason instanceof Error ? reason : new InternalServerError("Unhandled Promise Rejection");
  logger.error("Unhandled Rejection", error, {
    type: "UNHANDLED_REJECTION",
    processId: process.pid,
    reason: reason instanceof Error ? undefined : reason,
  });
  process.exit(1);
});

export default app;
