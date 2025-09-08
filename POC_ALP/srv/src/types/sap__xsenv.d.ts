declare module "@sap/xsenv" {
  /**
   * Load environment variables from default file
   */
  export function loadEnv(): void;

  /**
   * Get service credentials by service name
   * @param services Object containing service configurations
   */
  export function getServices(services: {
    [key: string]: {
      tag?: string;
      name?: string;
      label?: string;
    };
  }): {
    [key: string]: {
      [key: string]: any;
    };
  };
}
