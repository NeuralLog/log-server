import { AuthService } from '@neurallog/client-sdk';
import axios from 'axios';
import logger from '../utils/logger';
import { DiscoveryService } from './DiscoveryService';
import { CacheService } from './CacheService';

// Get the discovery service
const discoveryService = DiscoveryService.getInstance();

// Get the cache service
const cacheService = CacheService.getInstance();

/**
 * Client for the auth service using the client-sdk
 * This provides a source of truth for authentication
 */
export class AuthClient {
  private authService: AuthService;

  /**
   * Constructor
   *
   * @param authUrl Optional auth service URL (defaults to environment variable or localhost)
   */
  constructor(authUrl?: string) {
    // Initialize with the provided URL or from environment variables
    const initialAuthUrl = authUrl || process.env.AUTH_URL || 'http://localhost:3040';

    // Create an axios instance for the auth service
    const apiClient = axios.create({
      baseURL: initialAuthUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Create the auth service
    this.authService = new AuthService(initialAuthUrl, apiClient);

    // Initialize the auth service with the correct URL
    this.initialize();
  }

  /**
   * Initialize the auth client with the correct URL from the discovery service
   */
  private async initialize(): Promise<void> {
    try {
      // Get the auth URL from the discovery service
      const authUrl = await discoveryService.getAuthUrl();

      // Update the auth service URL
      this.authService.setBaseUrl(authUrl);

      logger.info(`AuthClient initialized with URL: ${authUrl}`);
    } catch (error) {
      logger.error(`Failed to initialize AuthClient: ${error instanceof Error ? error.message : String(error)}`);
      logger.warn('Using fallback URL from environment variables');
    }
  }

  /**
   * Verify a resource token
   *
   * @param token Resource token to verify
   * @returns Promise that resolves to the verification result
   */
  public async verifyResourceToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    tenantId?: string;
    resource?: string;
  }> {
    // Create a cache key based on the token
    const cacheKey = `resource_token:${token}`;

    // Try to get the result from cache first
    return await cacheService.getOrCompute(
      cacheKey,
      async () => {
        try {
          // Use the client-sdk to verify the token
          const result = await this.authService.verifyResourceToken(token);

          // Return the verification result
          return {
            valid: result.valid,
            userId: result.userId,
            tenantId: result.tenantId,
            resource: result.resource
          };
        } catch (error) {
          logger.error('Error verifying resource token:', error);
          return { valid: false };
        }
      },
      // Cache valid tokens for 5 minutes, invalid tokens for 1 minute
      300000
    );
  }

  /**
   * Verify an API key
   *
   * @param apiKey API key to verify
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the verification result
   */
  public async verifyApiKey(apiKey: string, tenantId: string): Promise<{
    valid: boolean;
    userId?: string;
  }> {
    // Create a cache key based on the API key and tenant ID
    const cacheKey = `api_key:${apiKey}:${tenantId}`;

    // Try to get the result from cache first
    return await cacheService.getOrCompute(
      cacheKey,
      async () => {
        try {
          // Use the client-sdk to verify the API key
          const valid = await this.authService.validateApiKey(apiKey);

          if (!valid) {
            return { valid: false };
          }

          // Get API key metadata
          const metadata = await this.getApiKeyMetadata(apiKey.split('.')[0], tenantId);

          if (metadata.error || !metadata.apiKey) {
            return { valid: false };
          }

          return {
            valid: true,
            userId: metadata.apiKey.userId
          };
        } catch (error) {
          logger.error('Error verifying API key:', error);
          return { valid: false };
        }
      },
      // Cache valid API keys for 5 minutes, invalid API keys for 1 minute
      300000
    );
  }

  /**
   * Get API key metadata
   *
   * @param keyId API key ID
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the API key metadata
   */
  public async getApiKeyMetadata(keyId: string, tenantId: string): Promise<{
    apiKey?: any;
    error?: string;
  }> {
    // Create a cache key based on the key ID and tenant ID
    const cacheKey = `api_key_metadata:${keyId}:${tenantId}`;

    // Try to get the result from cache first
    return await cacheService.getOrCompute(
      cacheKey,
      async () => {
        try {
          // Make a direct call to the auth service to get API key metadata
          const response = await axios.get(
            `${this.authService.getBaseUrl()}/api/apikeys/${keyId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId
              }
            }
          );

          return {
            apiKey: response.data
          };
        } catch (error) {
          logger.error('Error getting API key metadata:', error);
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
      // Cache API key metadata for 5 minutes
      300000
    );
  }

  /**
   * Check if a user has permission to perform an action on a resource
   *
   * @param token Auth token
   * @param action Action to check
   * @param resource Resource to check
   * @returns Promise that resolves to true if the user has permission
   */
  public async checkPermission(token: string, action: string, resource: string): Promise<boolean> {
    // Create a cache key based on the token, action, and resource
    const cacheKey = `permission:${token}:${action}:${resource}`;

    // Try to get the result from cache first
    return await cacheService.getOrCompute(
      cacheKey,
      async () => {
        try {
          // Use the client-sdk to check permission
          return await this.authService.checkPermission(token, action, resource);
        } catch (error) {
          logger.error('Error checking permission:', error);
          return false;
        }
      },
      // Cache permission checks for 5 minutes
      300000
    );
  }
}

// Create a default instance for backward compatibility
export const authClient = new AuthClient();
