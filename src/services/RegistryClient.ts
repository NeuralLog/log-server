import axios from 'axios';
import logger from '../utils/logger';

/**
 * Response from the registry service
 */
export interface EndpointResponse {
  tenantId: string;
  authUrl: string;
  serverUrl: string;
  webUrl: string;
  apiVersion: string;
}

/**
 * Client for interacting with the NeuralLog registry service
 */
export class RegistryClient {
  private static instance: RegistryClient;
  private registryUrl: string | null = null;
  private cachedEndpoints: Record<string, EndpointResponse> = {};
  private lastFetchTime: Record<string, number> = {};
  private cacheTtlMs: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the singleton instance
   * 
   * @returns The singleton instance
   */
  public static getInstance(): RegistryClient {
    if (!RegistryClient.instance) {
      RegistryClient.instance = new RegistryClient();
    }
    return RegistryClient.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Get registry URL from environment variables
    this.registryUrl = process.env.REGISTRY_URL || null;
    
    if (this.registryUrl) {
      logger.info(`Registry URL: ${this.registryUrl}`);
    } else {
      logger.warn('Registry URL not set, using environment variables for service URLs');
    }
  }

  /**
   * Check if the cache is valid for a tenant
   * 
   * @param tenantId Tenant ID
   * @returns True if the cache is valid, false otherwise
   */
  private isCacheValid(tenantId: string): boolean {
    if (!this.cachedEndpoints[tenantId]) {
      return false;
    }

    const now = Date.now();
    return now - (this.lastFetchTime[tenantId] || 0) < this.cacheTtlMs;
  }

  /**
   * Get endpoints for a tenant
   * 
   * @param tenantId Tenant ID
   * @param forceRefresh Force a refresh of the cache
   * @returns Promise that resolves to the endpoints
   */
  public async getEndpoints(tenantId: string, forceRefresh: boolean = false): Promise<EndpointResponse> {
    // If cache is valid and we're not forcing a refresh, return cached endpoints
    if (this.isCacheValid(tenantId) && !forceRefresh) {
      return this.cachedEndpoints[tenantId];
    }

    try {
      // If registry URL is not available, use environment variables
      if (!this.registryUrl) {
        return this.getEndpointsFromEnv(tenantId);
      }

      // Construct the registry URL for this tenant
      const tenantRegistryUrl = `${this.registryUrl}/endpoints?tenant=${tenantId}`;
      
      // Fetch endpoints from registry
      const response = await axios.get<EndpointResponse>(tenantRegistryUrl, {
        timeout: 5000
      });
      
      // Cache the endpoints
      this.cachedEndpoints[tenantId] = response.data;
      this.lastFetchTime[tenantId] = Date.now();
      
      logger.info(`Fetched endpoints for tenant ${tenantId} from registry`);
      return response.data;
    } catch (error) {
      logger.warn(`Failed to fetch endpoints for tenant ${tenantId} from registry: ${error instanceof Error ? error.message : String(error)}`);
      logger.warn('Falling back to environment variables');
      
      // Fall back to environment variables
      return this.getEndpointsFromEnv(tenantId);
    }
  }

  /**
   * Get endpoints from environment variables
   * 
   * @param tenantId Tenant ID
   * @returns Endpoints from environment variables
   */
  private getEndpointsFromEnv(tenantId: string): EndpointResponse {
    // Get URLs from environment variables
    const authUrl = process.env.AUTH_URL || `https://auth.${tenantId}.neurallog.app`;
    const serverUrl = process.env.SERVER_URL || `https://api.${tenantId}.neurallog.app`;
    const webUrl = process.env.WEB_URL || `https://${tenantId}.neurallog.app`;
    const apiVersion = process.env.API_VERSION || 'v1';

    // Construct endpoints from environment variables
    return {
      tenantId,
      authUrl,
      serverUrl,
      webUrl,
      apiVersion
    };
  }

  /**
   * Get the auth URL for a tenant
   * 
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the auth URL
   */
  public async getAuthUrl(tenantId: string): Promise<string> {
    const endpoints = await this.getEndpoints(tenantId);
    return endpoints.authUrl;
  }

  /**
   * Get the server URL for a tenant
   * 
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the server URL
   */
  public async getServerUrl(tenantId: string): Promise<string> {
    const endpoints = await this.getEndpoints(tenantId);
    return endpoints.serverUrl;
  }

  /**
   * Get the web URL for a tenant
   * 
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the web URL
   */
  public async getWebUrl(tenantId: string): Promise<string> {
    const endpoints = await this.getEndpoints(tenantId);
    return endpoints.webUrl;
  }

  /**
   * Get the API version for a tenant
   * 
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the API version
   */
  public async getApiVersion(tenantId: string): Promise<string> {
    const endpoints = await this.getEndpoints(tenantId);
    return endpoints.apiVersion;
  }
}
