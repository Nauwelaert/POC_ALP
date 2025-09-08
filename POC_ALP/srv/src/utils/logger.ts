/**
 * Enhanced logger utility for structured logging with context
 * Extended with Cloud Foundry logging support
 */

import cfLogger from "cf-nodejs-logging-support";
import * as os from "os";

// Initialize default logging context with system information
const defaultContext = {
  node_version: process.version,
  pid: process.pid,
  platform: os.platform(),
};

const startTextGreen = "\x1b[32m";
const startTextRed = "\x1b[31m";
const startTextMagenta = "\x1b[35m";
const startTextCyan = "\x1b[36m";
const endText = "\x1b[0m";

type LogLevel = "info" | "error" | "debug" | "warn";
type LogContext = Record<string, any>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    [key: string]: any;
  };
}

/**
 * Formats a log entry into a structured object
 */
const formatLogEntry = (level: LogLevel, message: string, context?: LogContext, error?: any): LogEntry => {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context) {
    logEntry.context = context;
  }

  if (error) {
    if (error instanceof Error) {
      const errorObj: Record<string, any> = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      // Check if error has toJSON method
      if (typeof (error as any).toJSON === "function") {
        Object.assign(errorObj, (error as any).toJSON());
      }

      logEntry.error = errorObj;
    } else {
      logEntry.error = error;
    }
  }

  return logEntry;
};

/**
 * Formats the log entry for console output with color coding
 */
const formatConsoleOutput = (entry: LogEntry, color: string): string => {
  let output = `${color}[${entry.level.toUpperCase()}] ${entry.message}${endText}`;

  if (entry.context || entry.error) {
    output += "\n" + JSON.stringify({ ...entry, message: undefined }, null, 2);
  }

  return output;
};

export const logger = {
  info: (message: string, context?: LogContext): void => {
    // Original colored console logging
    const entry = formatLogEntry("info", message, context);
    console.log(formatConsoleOutput(entry, startTextGreen));

    // CF logging with merged context
    cfLogger.logMessage("info", message, { ...defaultContext, ...context });
  },

  error: (message: string, errorOrContext?: Error | LogContext, context?: LogContext): void => {
    const error = errorOrContext instanceof Error ? errorOrContext : undefined;
    const logContext = error ? context : (errorOrContext as LogContext);

    // Original colored console logging
    const entry = formatLogEntry("error", message, logContext, error);
    console.error(formatConsoleOutput(entry, startTextRed));

    // CF logging
    const errorDetails = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(typeof (error as any).toJSON === "function" ? (error as any).toJSON() : {}),
          },
        }
      : {};
    cfLogger.logMessage("error", message, { ...defaultContext, ...errorDetails, ...logContext });
  },

  debug: (message: string, context?: LogContext): void => {
    if (process.env.NODE_ENV !== "production") {
      // Original colored console logging
      const entry = formatLogEntry("debug", message, context);
      console.debug(formatConsoleOutput(entry, startTextCyan));

      // CF logging
      cfLogger.logMessage("debug", message, { ...defaultContext, ...context });
    }
  },

  warn: (message: string, context?: LogContext): void => {
    // Original colored console logging
    const entry = formatLogEntry("warn", message, context);
    console.warn(formatConsoleOutput(entry, startTextMagenta));

    // CF logging
    cfLogger.logMessage("warning", message, { ...defaultContext, ...context });
  },
};
