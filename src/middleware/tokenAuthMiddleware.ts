import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Secret key for verifying server tokens
// This should match the secret in the auth service
const SERVER_TOKEN_SECRET = process.env.SERVER_TOKEN_SECRET || 'server-token-secret';

/**
 * Middleware to verify server access tokens
 * 
 * This middleware checks for a valid server access token in the Authorization header
 * If a valid token is found, it adds the user ID and tenant ID to the request
 * If no token is found, it falls back to API key authentication
 */
export const tokenAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
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
    
    // Verify the token
    const decoded = jwt.verify(token, SERVER_TOKEN_SECRET) as any;
    
    // Check if it's a server access token
    if (decoded.type !== 'server_access') {
      return next();
    }
    
    // Add user ID and tenant ID to request
    req.user = {
      id: decoded.sub,
      tenantId: decoded.tenant
    };
    
    // Token is valid, skip API key authentication
    req.isAuthenticated = true;
    
    next();
  } catch (error) {
    // If token verification fails, continue to API key authentication
    console.error('Token verification failed:', error);
    next();
  }
};
