import * as xsenv from "@sap/xsenv";
import { parseNumericEnv } from "../types/env.types";

// Load environment variables if VCAP_SERVICES is not set
if (!process.env.VCAP_SERVICES) {
  xsenv.loadEnv();
}

export interface ServerConfig {
  port: number;
  timeout: number;
}

interface UAAConfig {
  [key: string]: any; // Specific UAA config properties
}

interface DatasphereConfig {
  destinationName: string;
}

interface BatchConfig {
  contentType: string;
}

export interface AppConfig {
  server: ServerConfig;
  uaa: UAAConfig;
  datasphere: DatasphereConfig;
  batch: BatchConfig;
}

const config: AppConfig = {
  // Server configuration
  server: {
    port: parseNumericEnv(process.env.PORT, 3002),
    timeout: parseNumericEnv(process.env.SERVER_TIMEOUT, 180000), // Default: 3 minutes
  },

  // XSUAA configuration
  uaa: xsenv.getServices({ uaa: { tag: "xsuaa" } }).uaa,

  // Datasphere configuration
  datasphere: {
    destinationName: process.env.DATASPHERE_DESTINATION_NAME || "datasphere",
  },

  // Batch processing configuration
  batch: {
    contentType: process.env.BATCH_CONTENT_TYPE || "multipart/mixed",
  },
};

export default config;
