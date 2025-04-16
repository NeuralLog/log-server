import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { authClient } from '../services/AuthClient';
import { CacheService } from '../services/CacheService';

// Get the cache service
const cacheService = CacheService.getInstance();

/**
 * Combined authentication middleware
 * 
 * This middleware handles both resource token and API key authentication
 * It uses caching to improve performance
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip authentication if skipAuth flag is set
    if (req.skipAuth) {
      return next();
    }

    // Skip if already authenticated
    if (req.isAuthenticated) {
      return next();
    }

    // Get the tenant ID
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Create a cache key based on the request headers
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;
    const cacheKey = `auth:${authHeader || ''}:${apiKey || ''}:${tenantId}`;

    // Try to get the authentication result from cache
    const cachedAuth = cacheService.get(cacheKey);
    if (cachedAuth) {
      // Apply cached authentication result
      if (cachedAuth.isAuthenticated) {
        req.user = cachedAuth.user;
        req.isAuthenticated = true;
        req.resource = cachedAuth.resource;
        return next();
      } else {
        // If cached result indicates authentication failure, return unauthorized
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
      }
    }

    // Try resource token authentication first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        // Verify the token with the auth service
        const result = await authClient.verifyResourceToken(token);

        if (result.valid && result.userId && result.tenantId) {
          // Add user ID and tenant ID to request
          req.user = {
            id: result.userId,
            tenantId: result.tenantId
          };

          // Add resource information to request
          req.resource = result.resource;

          // Mark as authenticated
          req.isAuthenticated = true;

          // Cache the authentication result
          cacheService.set(cacheKey, {
            isAuthenticated: true,
            user: req.user,
            resource: req.resource
          }, 300000); // 5 minutes

          return next();
        }
      } catch (verifyError) {
        logger.error('Error verifying resource token:', verifyError);
      }
    }

    // Try API key authentication
    if (apiKey) {
      try {
        // Extract key ID from the API key
        const keyId = apiKey.split('.')[0];

        // Get the API key metadata from the auth service
        const metadataResult = await authClient.getApiKeyMetadata(keyId, tenantId);

        if (metadataResult.apiKey) {
          // Verify the API key
          const verifyResult = await authClient.verifyApiKey(apiKey, tenantId);

          // If the API key is valid, add the user ID and tenant ID to the request
          if (verifyResult.valid && verifyResult.userId) {
            req.user = {
              id: verifyResult.userId,
              tenantId
            };

            // Mark as authenticated
            req.isAuthenticated = true;

            // Cache the authentication result
            cacheService.set(cacheKey, {
              isAuthenticated: true,
              user: req.user
            }, 300000); // 5 minutes

            return next();
          }
        }
      } catch (error) {
        logger.error('Error verifying API key:', error);
      }
    }

    // Cache the authentication failure
    cacheService.set(cacheKey, {
      isAuthenticated: false
    }, 60000); // 1 minute

    // If we get here, authentication failed
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized'
    });
  } catch (error) {
    logger.error('Error in authentication middleware:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};
