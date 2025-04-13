import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import logger from '../utils/logger';

// Auth service URL
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3040';

/**
 * Middleware to verify API keys
 *
 * This middleware checks for a valid API key in the X-API-Key header
 * If a valid API key is found, it adds the user ID and tenant ID to the request
 *
 * It supports both traditional and zero-knowledge verification methods
 */
export const apiKeyAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip if already authenticated by token
    if (req.isAuthenticated) {
      return next();
    }

    // Get the API key from the header
    const apiKey = req.headers['x-api-key'] as string;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // If no API key, return unauthorized
    if (!apiKey) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: API key required'
      });
    }

    // Check if we have a verification hash in the database
    // If so, use zero-knowledge verification
    try {
      // Extract key ID from the API key
      const keyId = apiKey.split('.')[0];

      // Get the API key metadata from the auth service
      const metadataResponse = await axios.get(`${AUTH_SERVICE_URL}/api/apikeys/${keyId}`, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });

      const apiKeyData = metadataResponse.data.apiKey;

      // Always use the auth service for verification
      {
        // Fall back to traditional verification
        const response = await axios.post(`${AUTH_SERVICE_URL}/api/apikeys/verify`, {
          apiKey
        }, {
          headers: {
            'X-Tenant-ID': tenantId
          }
        });

        // If the API key is valid, add the user ID and tenant ID to the request
        if (response.data.valid) {
          req.user = {
            id: response.data.userId,
            tenantId
          };

          // Mark as authenticated
          req.isAuthenticated = true;

          return next();
        }
      }
    } catch (error) {
      logger.error('Error verifying API key:', error);
    }

    // If we get here, the API key is invalid
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Invalid API key'
    });
  } catch (error) {
    logger.error('Error in API key authentication middleware:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};
