import { UserProfile } from '@neurallog/client-sdk';
import { authClient } from './AuthClient';

/**
 * Service for authentication and authorization
 * This is a wrapper around the AuthClient that provides a simpler interface
 */
export class AuthService {
  /**
   * Validate a token
   *
   * @param token Token to validate
   * @returns User profile if token is valid, null otherwise
   */
  public async validateToken(token: string): Promise<UserProfile | null> {
    try {
      // Verify the token using the client-sdk
      const result = await authClient.verifyResourceToken(token);

      if (result.valid && result.userId) {
        // Return a user profile
        // Create a UserProfile with required fields
        return {
          id: result.userId,
          email: '', // Email is not available from the token verification
          tenantId: result.tenantId || '',
          name: '',
          isAdmin: false // Default to non-admin
        } as unknown as UserProfile;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a user has permission to perform an action on a resource
   *
   * @param token User token
   * @param action Action to perform
   * @param resource Resource to perform action on
   * @returns Whether the user has permission
   */
  public async checkPermission(token: string, action: string, resource: string): Promise<boolean> {
    try {
      // Check permission using the client-sdk
      return await authClient.checkPermission(token, action, resource);
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance
export const authService = new AuthService();