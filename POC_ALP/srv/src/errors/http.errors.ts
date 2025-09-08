import { BaseError, ErrorCode } from "./base.error";

/* ********************************* */

export class ODataError extends Error {
  status: number;
  code: string;
  target?: string;

  constructor(status: number, code: string, message: string, target?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.target = target;
  }
}

/* ********************************* */

export class ValidationError extends BaseError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.INVALID_INPUT, context?: Record<string, any>) {
    super(message, 400, errorCode, context);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.UNAUTHORIZED, context?: Record<string, any>) {
    super(message, 401, errorCode, context);
  }
}

export class NetworkError extends BaseError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.NETWORK_UNAVAILABLE, context?: Record<string, any>) {
    super(message, 503, errorCode, context);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.DB_CONNECTION_ERROR, context?: Record<string, any>) {
    super(message, 500, errorCode, context);
  }
}

export class BusinessError extends BaseError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.INVALID_OPERATION, context?: Record<string, any>) {
    super(message, 422, errorCode, context);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.RECORD_NOT_FOUND, context?: Record<string, any>) {
    super(message, 404, errorCode, context);
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.INTERNAL_ERROR, context?: Record<string, any>) {
    super(message, 500, errorCode, context);
  }
}

/**
 * Specific Datasphere error classes for better error handling and categorization
 */
export class DatasphereConnectionError extends NetworkError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.DATASPHERE_CONNECTION_ERROR, {
      service: "Datasphere",
      retryable: true,
      ...context,
    });
  }
}

export class DatasphereAuthError extends AuthenticationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.DATASPHERE_AUTH_ERROR, {
      service: "Datasphere",
      retryable: false,
      ...context,
    });
  }
}

export class DatasphereTimeoutError extends NetworkError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.DATASPHERE_TIMEOUT, {
      service: "Datasphere",
      retryable: true,
      ...context,
    });
  }
}

export class DatasphereModelError extends ValidationError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.DATASPHERE_INVALID_MODEL, {
      service: "Datasphere",
      retryable: false,
      ...context,
    });
  }
}

export class DatasphereBatchError extends BusinessError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.DATASPHERE_BATCH_ERROR, {
      service: "Datasphere",
      retryable: true,
      ...context,
    });
  }
}

export class DatasphereMetadataError extends BusinessError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.DATASPHERE_METADATA_ERROR, {
      service: "Datasphere",
      retryable: true,
      ...context,
    });
  }
}
