import { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import config from "../config/app.config";
import { BatchPart, BatchResponse, ErrorWithStatus } from "../types/datasphere.types";
import { logger } from "../utils/logger";

function parseBatchBody(body: string, boundary: string): BatchPart[] {
  logger.debug("Parsing batch body with boundary", { boundary });

  const boundaryDelimiter = `--${boundary}`;
  const boundaryEnd = `--${boundary}--`;
  const parts = body.split(boundaryDelimiter).filter((part) => part.trim() && part !== boundaryEnd);

  return parts.map((part) => {
    const [headers, ...bodyLines] = part.trim().split(/\r?\n/);
    const headerObject: Record<string, string> = {};
    let bodyIndex = 0;

    bodyLines.forEach((line, i) => {
      if (!line.trim()) {
        bodyIndex = i + 1; // Headers end here
        return;
      }
      const [key, value] = line.split(/:(.+)/);
      if (key && value) {
        headerObject[key.trim()] = value.trim();
      }
    });

    const bodyContent = bodyLines.slice(bodyIndex).join("\n").trim();
    return { headers: headerObject, body: bodyContent };
  });
}

export function transformBatchResponse(requestBody: string, data: string): BatchResponse {
  logger.debug("Transforming batch response");

  // Extract the original batch ID
  const batchIdMatch = requestBody.match(/--batch_id-(\d+)-(\d+)--/);

  if (!batchIdMatch) {
    const error = new Error("Invalid batch ID format in request body") as ErrorWithStatus;
    error.status = 400;
    throw error;
  }

  const originalBatchId = batchIdMatch[1];
  const newBatchId = Date.now();
  const batchIdString = `batch_${newBatchId}-${originalBatchId}`;

  // ! *************************************** //
  // ! BE CAREFUL ** Do NOT change this string //
  // ! *************************************** //

  const responseBody = `--${batchIdString}--
Content-Type:application/http
OData-Version: 4.0
\r\n\r\n
HTTP/1.1 200 OK
OData-Version: 4.0
Content-Type: application/json;odata.metadata=minimal   
Content-Length: ${data.length}
\r\n\r\n
${data}

--${batchIdString}--`;

  return {
    body: responseBody,
    id: batchIdString,
  };
}

export const batchMiddleware = [
  // Parse raw body for multipart/mixed requests
  bodyParser.raw({ type: config.batch.contentType }),

  // Process batch requests
  (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"];
    if (contentType?.startsWith(config.batch.contentType)) {
      try {
        const rawBody = req.body.toString("utf-8");
        const boundaryMatch = contentType.match(/boundary=(.+)$/);

        if (!boundaryMatch) {
          const error = new Error("Missing boundary in Content-Type header") as ErrorWithStatus;
          error.status = 400;
          throw error;
        }

        req.batch = parseBatchBody(rawBody, boundaryMatch[1]);
        logger.debug("Successfully parsed batch request");
        next();
      } catch (error) {
        logger.error("Batch parsing error", error instanceof Error ? error : new Error(String(error)));
        const status = (error as ErrorWithStatus).status || 400;
        res.status(status).json({
          error: "Invalid Batch Request",
          message: error instanceof Error ? error.message : "Failed to parse batch request",
        });
      }
    } else {
      next();
    }
  },
];
