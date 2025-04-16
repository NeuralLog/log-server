import { DiscoveryService as ClientDiscoveryService } from '@neurallog/client-sdk';
import logger from '../utils/logger';

/**
 * Service for discovering NeuralLog service endpoints
 * This is a wrapper around the client-sdk's DiscoveryService
 */
export class DiscoveryService {
  private static instance: DiscoveryService;
  private clientDiscoveryService: ClientDiscoveryService;
  private tenantId: string;
  private registryUrl: string | null;

  /**
   * Get the singleton instance
   * 
   * @returns The singleton instance
   */
  public static getInstance(): DiscoveryService {
    if (!DiscoveryService.instance) {
      DiscoveryService.instance = new DiscoveryService();
    }
    return DiscoveryService.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Get tenant ID and registry URL from environment variables
    this.tenantId = process.env.TENANT_ID || 'default';
    this.registryUrl = process.env.REGISTRY_URL || null;
    
    // Get service URLs from environment variables (fallbacks)
    const authUrl = process.env.AUTH_URL || null;
    const serverUrl = process.env.SERVER_URL || null;
    const webUrl = process.env.WEB_URL || null;
    
    // Create client discovery service
    this.clientDiscoveryService = new ClientDiscoveryService(
      this.tenantId,
      this.registryUrl || undefined,
      authUrl || undefined,
      serverUrl || undefined,
      webUrl || undefined
    );
    
    logger.info(`DiscoveryService initialized for tenant ${this.tenantId}`);
    if (this.registryUrl) {
      logger.info(`Using registry URL: ${this.registryUrl}`);
    } else {
      logger.warn('Registry URL not set, using environment variables for service URLs');
    }
  }

  /**
   * Get the auth URL for the current tenant
   * 
   * @returns Promise that resolves to the auth URL
   */
  public async getAuthUrl(): Promise<string> {
    try {
      const authUrl = await this.clientDiscoveryService.getAuthUrl();
      logger.debug(`Resolved auth URL: ${authUrl}`);
      return authUrl;
    } catch (error) {
      logger.error(`Failed to get auth URL: ${error instanceof Error ? error.message : String(error)}`);
      // Fall back to environment variable
      const fallbackUrl = process.env.AUTH_URL || `https://auth.${this.tenantId}.neurallog.app`;
      logger.warn(`Falling back to environment variable: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * Get the server URL for the current tenant
   * 
   * @returns Promise that resolves to the server URL
   */
  public async getServerUrl(): Promise<string> {
    try {
      const serverUrl = await this.clientDiscoveryService.getServerUrl();
      logger.debug(`Resolved server URL: ${serverUrl}`);
      return serverUrl;
    } catch (error) {
      logger.error(`Failed to get server URL: ${error instanceof Error ? error.message : String(error)}`);
      // Fall back to environment variable
      const fallbackUrl = process.env.SERVER_URL || `https://api.${this.tenantId}.neurallog.app`;
      logger.warn(`Falling back to environment variable: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * Get the web URL for the current tenant
   * 
   * @returns Promise that resolves to the web URL
   */
  public async getWebUrl(): Promise<string> {
    try {
      const webUrl = await this.clientDiscoveryService.getWebUrl();
      logger.debug(`Resolved web URL: ${webUrl}`);
      return webUrl;
    } catch (error) {
      logger.error(`Failed to get web URL: ${error instanceof Error ? error.message : String(error)}`);
      // Fall back to environment variable
      const fallbackUrl = process.env.WEB_URL || `https://${this.tenantId}.neurallog.app`;
      logger.warn(`Falling back to environment variable: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * Get the API version for the current tenant
   * 
   * @returns Promise that resolves to the API version
   */
  public async getApiVersion(): Promise<string> {
    try {
      const apiVersion = await this.clientDiscoveryService.getApiVersion();
      logger.debug(`Resolved API version: ${apiVersion}`);
      return apiVersion;
    } catch (error) {
      logger.error(`Failed to get API version: ${error instanceof Error ? error.message : String(error)}`);
      // Fall back to environment variable
      const fallbackVersion = process.env.API_VERSION || 'v1';
      logger.warn(`Falling back to environment variable: ${fallbackVersion}`);
      return fallbackVersion;
    }
  }

  /**
   * Get the tenant ID
   * 
   * @returns The tenant ID
   */
  public getTenantId(): string {
    return this.tenantId;
  }
}
