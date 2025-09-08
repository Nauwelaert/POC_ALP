/**
 * Type definitions for environment variables used in the application
 */

export interface EnvironmentVariables {
  /**
   * Port number for the server to listen on
   * @default 3002
   */
  PORT?: string;

  /**
   * Server timeout in milliseconds
   * @default 180000 (3 minutes)
   */
  SERVER_TIMEOUT?: string;

  /**
   * Name of the Datasphere destination
   * @default "datasphere"
   */
  DATASPHERE_DESTINATION_NAME?: string;

  /**
   * Content type for batch processing
   * @default "multipart/mixed"
   */
  BATCH_CONTENT_TYPE?: string;

  /**
   * Cloud Foundry VCAP Services
   * Contains service binding information
   */
  VCAP_SERVICES?: string;
}

/**
 * Type guard to check if all required environment variables are present
 * @param env Partial environment variables object
 * @returns True if all required variables are present and of correct type
 */
export function isValidEnvironment(env: Partial<EnvironmentVariables>): env is EnvironmentVariables {
  // Add validation for required variables if needed
  return true;
}

/**
 * Helper function to parse numeric environment variables
 * @param value Environment variable value
 * @param defaultValue Default value if parsing fails
 * @returns Parsed number or default value
 */
export function parseNumericEnv(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Declare global NodeJS namespace augmentation for type checking
declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvironmentVariables {}
  }
}
