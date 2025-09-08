import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { BaseError } from "../errors/base.error";
import { logger } from "../utils/logger";

/**
 * Centralized error handling middleware
 * Processes errors and sends appropriate responses while logging details
 */
export const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  try {
    // Create context object with request details
    const errorContext = {
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? "[REDACTED]" : undefined,
      },
      timestamp: new Date().toISOString(),
    };

    const errorResponse = {
      error: {
        code: "500",
        //@ts-ignore
        message: err?.context?.originalError || err.message,
        //      details: [{ code: "BackendError", message: err.message }],
      },
    };
    res.status(500).json(errorResponse);
  } catch (e: unknown) {
    const errorInHandler = e instanceof Error ? e : new Error("Unknown error in handler");
    logger.error("Error in error handler", errorInHandler);
    res.status(500).json({
      error: "InternalServerError",
      message: "An unexpected error occurred in error handler",
      errorCode: "ERR_5001",
    });
  }
};

/**
 * Middleware to handle 404 Not Found errors
 */
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn("Resource not found", {
    path: req.path,
    method: req.method,
    query: req.query,
    timestamp: new Date().toISOString(),
  });

  res.status(404).json({
    error: "NotFoundError",
    message: "The requested resource was not found",
    errorCode: "ERR_4404",
  });
};

/**
 * Async handler wrapper to catch unhandled promise rejections
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
