import { AuthService } from '@neurallog/client-sdk';
import axios from 'axios';
import logger from '../utils/logger';
import { DiscoveryService } from './DiscoveryService';

// Get the discovery service
const discoveryService = DiscoveryService.getInstance();

/**
 * Client for the auth service using the client-sdk
 * This provides a single source of truth for authentication
 */
export class AuthClient {
  private static instance: AuthClient;
  private authService: AuthService;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize with a temporary URL, will be updated in initialize()
    const tempAuthUrl = process.env.AUTH_URL || 'http://localhost:3040';

    // Create an axios instance for the auth service
    const apiClient = axios.create({
      baseURL: tempAuthUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Create the auth service
    this.authService = new AuthService(tempAuthUrl, apiClient);

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
   * Get the singleton instance
   *
   * @returns The AuthClient instance
   */
  public static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
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
    try {
      // Since the client-sdk doesn't have a direct verifyResourceToken method,
      // we'll implement a basic verification here
      // In a real implementation, this would make a direct call to the auth service
      // or use a method from the client-sdk

      // For now, we'll just return a mock result
      // This should be replaced with a proper implementation
      return {
        valid: true,
        userId: 'user-123',
        tenantId: 'tenant-123',
        resource: 'logs'
      };
    } catch (error) {
      logger.error('Error verifying resource token:', error);
      return { valid: false };
    }
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
    try {
      // Since the client-sdk doesn't have a direct verifyApiKey method,
      // we'll implement a basic verification here
      // In a real implementation, this would make a direct call to the auth service
      // or use a method from the client-sdk

      // For now, we'll just return a mock result
      // This should be replaced with a proper implementation
      return {
        valid: true,
        userId: 'user-123'
      };
    } catch (error) {
      logger.error('Error verifying API key:', error);
      return { valid: false };
    }
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
    try {
      // Since the client-sdk doesn't have a direct getApiKeyById method,
      // we'll implement a basic mock here
      // In a real implementation, this would make a direct call to the auth service
      // or use a method from the client-sdk

      // For now, we'll just return a mock result
      // This should be replaced with a proper implementation
      return {
        apiKey: {
          id: keyId,
          userId: 'user-123',
          tenantId: tenantId,
          name: 'Mock API Key',
          scopes: ['logs:read', 'logs:write'],
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
    } catch (error) {
      logger.error('Error getting API key metadata:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
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
    try {
      // Use the client-sdk to check permission
      return await this.authService.checkPermission(token, action, resource);
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const authClient = AuthClient.getInstance();
