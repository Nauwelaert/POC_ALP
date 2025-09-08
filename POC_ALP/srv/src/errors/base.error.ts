/**
 * Base error class that extends Error with additional properties for better error handling
 */
export abstract class BaseError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly errorCode: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts the error to a JSON object suitable for logging and client responses
   */

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      errorCode: this.errorCode,
      ...(this.context && { context: this.context }),
      ...(process.env.NODE_ENV !== "production" && { stack: this.stack }),
    };
  }
}

/**
 * Error codes enum for consistent error tracking
 */
export enum ErrorCode {
  // Validation Errors (4000-4099)
  INVALID_INPUT = "ERR_4000",
  MISSING_REQUIRED_FIELD = "ERR_4001",
  INVALID_FORMAT = "ERR_4002",

  // Authentication Errors (4100-4199)
  UNAUTHORIZED = "ERR_4100",
  INVALID_TOKEN = "ERR_4101",
  TOKEN_EXPIRED = "ERR_4102",

  // Network Errors (4200-4299)
  NETWORK_UNAVAILABLE = "ERR_4200",
  TIMEOUT = "ERR_4201",
  API_ERROR = "ERR_4202",

  // Database Errors (4300-4399)
  DB_CONNECTION_ERROR = "ERR_4300",
  QUERY_ERROR = "ERR_4301",
  RECORD_NOT_FOUND = "ERR_4302",

  // Business Logic Errors (4400-4499)
  INVALID_OPERATION = "ERR_4400",
  RESOURCE_CONFLICT = "ERR_4401",

  // System Errors (5000-5099)
  INTERNAL_ERROR = "ERR_5000",
  EXTERNAL_SERVICE_ERROR = "ERR_5001",
  CONFIGURATION_ERROR = "ERR_5002",

  // Datasphere Errors (4600-4699)
  DATASPHERE_CONNECTION_ERROR = "ERR_4600",
  DATASPHERE_AUTH_ERROR = "ERR_4601",
  DATASPHERE_TIMEOUT = "ERR_4602",
  DATASPHERE_INVALID_MODEL = "ERR_4603",
  DATASPHERE_BATCH_ERROR = "ERR_4604",
  DATASPHERE_METADATA_ERROR = "ERR_4605",
}
