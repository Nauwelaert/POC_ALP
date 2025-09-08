import { Request, Response } from "express";
import { retrieveJwt, getDestination, HttpDestinationOrFetchOptions } from "@sap-cloud-sdk/connectivity";
import { executeHttpRequest } from "@sap-cloud-sdk/http-client";
import config from "../config/app.config";
import { DatasphereRequestOptions, DestinationConfig, BatchResponse } from "../types/datasphere.types";
import { logger } from "../utils/logger";
import {
  NotFoundError,
  ValidationError,
  DatasphereTimeoutError,
  DatasphereConnectionError,
  DatasphereAuthError,
  DatasphereModelError,
  DatasphereMetadataError,
  DatasphereBatchError,
} from "../errors/http.errors";
import { ErrorCode, BaseError } from "../errors/base.error";
import { cleanXML } from "../utils/xml-parser";
import { AxiosError } from "axios";



class DatasphereService {
  /**
   * Validates and processes the root request
   * @throws {ValidationError} If no specific path is provided
   */
  async handleRoot(): Promise<never> {
    logger.info("Handling root request");
    throw new ValidationError("Please define a path to a Datasphere model", ErrorCode.MISSING_REQUIRED_FIELD);
  }

  /**
   * Validates the path and determines the response content type
   */
  validateAndProcessPath(path: string): { contentType?: string } {
    if (!path) {
      throw new ValidationError("Path to a Datasphere model is required", ErrorCode.MISSING_REQUIRED_FIELD);
    }
    return {
      contentType: path.includes("$metadata") ? "text/xml" : undefined,
    };
  }

  async getData(req: Request, path: string, options: DatasphereRequestOptions = {}): Promise<any> /*Promise<DatasphereResponse>*/ {

    const destination = await this.getDestinationConfig(req);
    let url = `${destination.url}${path}`;

    try {
      const response = await executeHttpRequest(destination as HttpDestinationOrFetchOptions, {
        url,
        method: "GET",
        headers: { "Content-Type": "application/xml" },
        params: req.query,
        ...options,
      });

      //To be deleted when namings in Datasphere are safe
      if (req.path.includes("$metadata")) {
        const cleanedXml = await cleanXML(response.data);
        response.data = cleanedXml;
      }

      return response;
    } catch (error) {

      // Handle SAP Cloud SDK specific errors
      if (error instanceof AxiosError) {
        const context = {
          url,
          path,
          query: req.query,
          destinationName: config.datasphere.destinationName,
          timestamp: new Date().toISOString(),
          originalError: error?.response?.data?.message || error?.message,
        };

        // Handle timeout and network errors
        if (error.message.includes("timeout")) {
          throw new DatasphereTimeoutError("Request to Datasphere timed out. Please try again.", context);
        }

        if (error.message.includes("network")) {
          throw new DatasphereConnectionError("Failed to connect to Datasphere. Please check your network connection.", context);
        }

        // Handle authentication errors
        if (error.message.includes("401") || error.message.includes("403")) {
          throw new DatasphereAuthError("Authentication failed. Please check your credentials.", context);
        }

        // Handle not found errors
        if (error.message.includes("404")) {
          throw new DatasphereModelError("The requested Datasphere model or resource was not found.", context);
        }

        // Handle metadata specific errors
        if (req.path.includes("$metadata")) {
          throw new DatasphereMetadataError("Failed to retrieve Datasphere metadata.", {
            ...context,
            suggestion: "Check if the metadata path is correct and accessible.",
          });
        }

        // Handle other API errors
        throw new DatasphereConnectionError("An error occurred while communicating with Datasphere.", {
          ...context,
          suggestion: "Please try again later or contact support if the issue persists.",
        });
    }
    }
  }

  /**
   * Processes a batch request and prepares the response
   */
  async processBatchRequest(req: Request): Promise<BatchResponse> {
    try {
      if (!req.batch?.[0]) {
        throw new ValidationError("Invalid batch request format", ErrorCode.INVALID_FORMAT, { batch: req.batch });
      }

      const path = this.extractBatchPath(req);
      logger.info("Processing batch request", { path });

      const result = await this.getData(req, path);

      if (!result?.data) {
        throw new DatasphereBatchError("Batch processing returned no data", {
          path,
          timestamp: new Date().toISOString(),
          suggestion: "Verify that the requested data exists and is accessible",
        });
      }

      // Add count for pagination
      const skip = Number(req.query.$skip) || 0;
      const top = Number(req.query.$top) || 0;

      if (isNaN(skip) || isNaN(top)) {
        throw new DatasphereBatchError("Invalid pagination parameters", {
          skip: req.query.$skip,
          top: req.query.$top,
          suggestion: "Ensure $skip and $top query parameters are valid numbers",
        });
      }

      const count = skip + top * 2;
      result.data["@odata.count"] = count;

      // Transform batch response
      const transformedBatch = this.transformBatchResponse(req.body.toString(), JSON.stringify(result.data));

      return transformedBatch;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw if it's already a known error type
        if (error instanceof BaseError) {
          throw error;
        }

        // Otherwise wrap in DatasphereBatchError
        throw new DatasphereBatchError("Failed to process batch request", {
          originalError: error.message,
          timestamp: new Date().toISOString(),
          suggestion: "Please check the request format and try again",
        });
      }

      throw new DatasphereBatchError("Unknown error in batch processing", {
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Extracts the batch path from the request
   */
  private extractBatchPath(req: Request): string {
    try {
      const batchBody = req.batch![0].body;
      const path = batchBody.split("GET")[1].split("HTTP")[0].trim();
      const rootPath = req.path.replace("datasphere/", "").replace("$batch", "");
      return decodeURIComponent(new URLSearchParams(`${rootPath}${path}`).toString()).substring(1);
    } catch (error) {
      throw new ValidationError("Failed to extract batch path from request", ErrorCode.INVALID_FORMAT, { request: req.path, batch: req.batch });
    }
  }

  /**
   * Transforms the batch response
   */
  private transformBatchResponse(requestBody: string, responseData: string): BatchResponse {
    const batchId = `batch_${Date.now()}`;
    const responseBody = `--${batchId}\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n${responseData}\r\n--${batchId}--`;

    return {
      id: batchId,
      body: responseBody,
    };
  }

  /**
   * Sets batch response headers
   */
  setBatchResponseHeaders(res: Response, batchId: string): void {
    res.setHeader("OData-Version", "4.0");
    res.setHeader("Content-Type", `multipart/mixed; boundary=${batchId}`);
  }

  private async getDestinationConfig(req: Request): Promise<DestinationConfig> {
    const jwt = retrieveJwt(req);
    const destinationName = config.datasphere.destinationName;

    logger.debug("Retrieving destination configuration", { destinationName });

    const dest = await getDestination({
      destinationName,
      jwt,
    });

    if (!dest?.url) {
      throw new NotFoundError(`Destination ${destinationName} not found or missing URL`, ErrorCode.CONFIGURATION_ERROR, {
        destinationName,
        destination: dest,
      });
    }

    return dest as DestinationConfig;
  }
}

// Export singleton instance
export default new DatasphereService();
