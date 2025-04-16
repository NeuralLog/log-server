import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { authClient } from '../services/AuthClient';

/**
 * Middleware to verify server access tokens
 *
 * This middleware checks for a valid server access token in the Authorization header
 * If a valid token is found, it adds the user ID and tenant ID to the request
 * If no token is found, it falls back to API key authentication
 */
export const tokenAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip authentication if skipAuth flag is set
    if (req.skipAuth) {
      return next();
    }
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    // If no Authorization header, continue to API key authentication
    if (!authHeader) {
      return next();
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return next();
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    try {
      // Verify the token using the client-sdk
      const result = await authClient.verifyResourceToken(token);

      if (result.valid && result.userId && result.tenantId) {
        // Add user ID and tenant ID to request
        req.user = {
          id: result.userId,
          tenantId: result.tenantId
        };

        // Token is valid, skip API key authentication
        req.isAuthenticated = true;

        return next();
      }
    } catch (verifyError) {
      logger.error('Error verifying token:', verifyError);
    }

    // Continue to next middleware
    next();
  } catch (error) {
    // If token verification fails, continue to API key authentication
    console.error('Token verification failed:', error);
    next();
  }
};
