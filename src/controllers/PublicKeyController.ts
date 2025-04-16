import { Request, Response } from 'express';
import logger from '../utils/logger';
import { StorageAdapterFactory } from '../storage/StorageAdapterFactory';

/**
 * Controller for managing public keys
 */
export const publicKeyController = {
  /**
   * Store a public key for a user
   * 
   * @param req Request
   * @param res Response
   */
  storePublicKey: async (req: Request, res: Response) => {
    try {
      // Get the user ID from the authenticated user
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
      }

      // Get the public key from the request body
      const { publicKey, keyId } = req.body;

      // Validate the request
      if (!publicKey || !keyId) {
        return res.status(400).json({
          status: 'error',
          message: 'Public key and key ID are required',
          code: 'bad_request'
        });
      }

      // Get the storage adapter
      const storageAdapter = StorageAdapterFactory.getStorageAdapter();

      // Store the public key
      await storageAdapter.set(`public_key:${tenantId}:${userId}:${keyId}`, publicKey);

      // Return success
      return res.status(200).json({
        status: 'success',
        message: 'Public key stored successfully'
      });
    } catch (error) {
      logger.error('Error storing public key:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    }
  },

  /**
   * Get a public key for a user
   * 
   * @param req Request
   * @param res Response
   */
  getPublicKey: async (req: Request, res: Response) => {
    try {
      // Get the tenant ID from the authenticated user
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
      }

      // Get the user ID and key ID from the request parameters
      const { userId, keyId } = req.params;

      // Validate the request
      if (!userId || !keyId) {
        return res.status(400).json({
          status: 'error',
          message: 'User ID and key ID are required',
          code: 'bad_request'
        });
      }

      // Get the storage adapter
      const storageAdapter = StorageAdapterFactory.getStorageAdapter();

      // Get the public key
      const publicKey = await storageAdapter.get(`public_key:${tenantId}:${userId}:${keyId}`);

      // If the public key doesn't exist, return 404
      if (!publicKey) {
        return res.status(404).json({
          status: 'error',
          message: 'Public key not found',
          code: 'not_found'
        });
      }

      // Return the public key
      return res.status(200).json({
        status: 'success',
        publicKey
      });
    } catch (error) {
      logger.error('Error getting public key:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    }
  },

  /**
   * Delete a public key for a user
   * 
   * @param req Request
   * @param res Response
   */
  deletePublicKey: async (req: Request, res: Response) => {
    try {
      // Get the user ID from the authenticated user
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
      }

      // Get the key ID from the request parameters
      const { keyId } = req.params;

      // Validate the request
      if (!keyId) {
        return res.status(400).json({
          status: 'error',
          message: 'Key ID is required',
          code: 'bad_request'
        });
      }

      // Get the storage adapter
      const storageAdapter = StorageAdapterFactory.getStorageAdapter();

      // Delete the public key
      await storageAdapter.delete(`public_key:${tenantId}:${userId}:${keyId}`);

      // Return success
      return res.status(200).json({
        status: 'success',
        message: 'Public key deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting public key:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    }
  },

  /**
   * List all public keys for a user
   * 
   * @param req Request
   * @param res Response
   */
  listPublicKeys: async (req: Request, res: Response) => {
    try {
      // Get the tenant ID from the authenticated user
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
      }

      // Get the user ID from the request parameters
      const { userId } = req.params;

      // Validate the request
      if (!userId) {
        return res.status(400).json({
          status: 'error',
          message: 'User ID is required',
          code: 'bad_request'
        });
      }

      // Get the storage adapter
      const storageAdapter = StorageAdapterFactory.getStorageAdapter();

      // List all public keys for the user
      const keys = await storageAdapter.list(`public_key:${tenantId}:${userId}:`);

      // Extract the key IDs from the keys
      const keyIds = keys.map(key => {
        const parts = key.split(':');
        return parts[parts.length - 1];
      });

      // Return the key IDs
      return res.status(200).json({
        status: 'success',
        keyIds
      });
    } catch (error) {
      logger.error('Error listing public keys:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    }
  }
};
