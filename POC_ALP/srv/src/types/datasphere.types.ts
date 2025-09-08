import { Request } from "express";
import { HttpResponse } from "@sap-cloud-sdk/http-client";

export interface ErrorWithStatus extends Error {
  status?: number;
}

export interface DatasphereRequestOptions {
  [key: string]: unknown;
}

export interface BatchPart {
  headers: Record<string, string>;
  body: string;
}

export interface BatchResponse {
  body: string;
  id: string;
}

export interface BatchTransformResult {
  body: string;
  id: string;
}

export interface DatasphereResponse extends HttpResponse {
  data: {
    "@odata.count"?: number;
    [key: string]: any;
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      batch?: BatchPart[];
    }
  }
}

export interface DestinationConfig {
  url: string;
  [key: string]: any;
}

export interface BatchRequestMetadata {
  path: string;
  count: number;
}
