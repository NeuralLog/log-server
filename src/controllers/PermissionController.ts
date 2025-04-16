import { Request, Response } from 'express';
import { AuthClient } from '../services/AuthClient';
import logger from '../utils/logger';

// Create a new instance of AuthClient
const authClient = new AuthClient();

/**
 * Controller for permission-related operations
 */
export class PermissionController {
  /**
   * Check if a user has permission to perform an action on a resource
   *
   * @param req Express request
   * @param res Express response
   */
  public async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      // Get the auth token from the request
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'No authorization token provided',
          code: 'unauthorized'
        });
        return;
      }

      // Get the action and resource from the request body
      const { action, resource, contextualTuples } = req.body;

      // Validate the request
      if (!action || !resource) {
        res.status(400).json({
          status: 'error',
          message: 'Action and resource are required',
          code: 'bad_request'
        });
        return;
      }

      // Check the permission
      const allowed = await authClient.checkPermission(token, action, resource);

      // Return the result
      res.status(200).json({
        allowed
      });
    } catch (error) {
      logger.error('Error checking permission:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        code: 'server_error'
      });
    }
  }
}

// Create a singleton instance
export const permissionController = new PermissionController();
