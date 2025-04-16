import { Request, Response } from 'express';
import logger from '../utils/logger';
import { StorageAdapterFactory } from '../storage/StorageAdapterFactory';

/**
 * Controller for managing KEK versions
 */
export const kekController = {
  /**
   * Store a new KEK version
   * 
   * @param req Request
   * @param res Response
   */
  storeKEKVersion: async (req: Request, res: Response) => {
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

      // Get the KEK version from the request body
      const { id, createdAt, status, reason } = req.body;

      // Validate the request
      if (!id || !createdAt || !status) {
        return res.status(400).json({
          status: 'error',
          message: 'ID, createdAt, and status are required',
          code: 'bad_request'
        });
      }

      // Create the KEK version object
      const kekVersion = {
        id,
        createdAt,
        createdBy: userId,
        status,
        reason: reason || 'Not specified'
      };

      // Get the storage adapter
      const storageAdapter = StorageAdapterFactory.getStorageAdapter();

      // Store the KEK version
      await storageAdapter.set(`kek_version:${tenantId}:${id}`, JSON.stringify(kekVersion));

      // If the status is 'active', update any existing active versions to 'decrypt-only'
      if (status === 'active') {
        // Get all KEK versions
        const versions = await storageAdapter.list(`kek_version:${tenantId}:`);

        // Update any active versions to 'decrypt-only'
        for (const versionKey of versions) {
          // Skip the current version
          if (versionKey === `kek_version:${tenantId}:${id}`) {
            continue;
          }

          // Get the version
          const versionStr = await storageAdapter.get(versionKey);
          if (!versionStr) {
            continue;
          }

          // Parse the version
          const version = JSON.parse(versionStr);

          // If the version is active, update it to 'decrypt-only'
          if (version.status === 'active') {
            version.status = 'decrypt-only';
            await storageAdapter.set(versionKey, JSON.stringify(version));
          }
        }
      }

      // Return success
      return res.status(200).json({
        status: 'success',
        message: 'KEK version stored successfully',
        kekVersion
      });
    } catch (error) {
      logger.error('Error storing KEK version:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    }
  },

  /**
   * Get a KEK version
   * 
   * @param req Request
   * @param res Response
   */
  getKEKVersion: async (req: Request, res: Response) => {
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

      // Get the version ID from the request parameters
      const { id } = req.params;

      // Validate the request
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'Version ID is required',
          code: 'bad_request'
        });
      }

      // Get the storage adapter
      const storageAdapter = StorageAdapterFactory.getStorageAdapter();

      // Get the KEK version
      const kekVersionStr = await storageAdapter.get(`kek_version:${tenantId}:${id}`);

      // If the KEK version doesn't exist, return 404
      if (!kekVersionStr) {
        return res.status(404).json({
          status: 'error',
          message: 'KEK version not found',
          code: 'not_found'
        });
      }

      // Parse the KEK version
      const kekVersion = JSON.parse(kekVersionStr);

      // Return the KEK version
      return res.status(200).json({
        status: 'success',
        kekVersion
      });
    } catch (error) {
      logger.error('Error getting KEK version:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    }
  },

  /**
   * List all KEK versions
   * 
   * @param req Request
   * @param res Response
   */
  listKEKVersions: async (req: Request, res: Response) => {
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

      // Get the storage adapter
      const storageAdapter = StorageAdapterFactory.getStorageAdapter();

      // List all KEK versions
      const versionKeys = await storageAdapter.list(`kek_version:${tenantId}:`);

      // Get all versions
      const versions = [];
      for (const versionKey of versionKeys) {
        const versionStr = await storageAdapter.get(versionKey);
        if (versionStr) {
          versions.push(JSON.parse(versionStr));
        }
      }

      // Sort versions by creation date (newest first)
      versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Return the versions
      return res.status(200).json({
        status: 'success',
        versions
      });
    } catch (error) {
      logger.error('Error listing KEK versions:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    }
  },

  /**
   * Get the current active KEK version
   * 
   * @param req Request
   * @param res Response
   */
  getCurrentKEKVersion: async (req: Request, res: Response) => {
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

      // Get the storage adapter
      const storageAdapter = StorageAdapterFactory.getStorageAdapter();

      // List all KEK versions
      const versionKeys = await storageAdapter.list(`kek_version:${tenantId}:`);

      // Find the active version
      let activeVersion = null;
      for (const versionKey of versionKeys) {
        const versionStr = await storageAdapter.get(versionKey);
        if (versionStr) {
          const version = JSON.parse(versionStr);
          if (version.status === 'active') {
            activeVersion = version;
            break;
          }
        }
      }

      // If no active version found, return 404
      if (!activeVersion) {
        return res.status(404).json({
          status: 'error',
          message: 'No active KEK version found',
          code: 'not_found'
        });
      }

      // Return the active version
      return res.status(200).json({
        status: 'success',
        kekVersion: activeVersion
      });
    } catch (error) {
      logger.error('Error getting current KEK version:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    }
  },

  /**
   * Update a KEK version
   * 
   * @param req Request
   * @param res Response
   */
  updateKEKVersion: async (req: Request, res: Response) => {
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

      // Get the version ID from the request parameters
      const { id } = req.params;

      // Validate the request
      if (!id) {
        return res.status(400).json({
          status: 'error',
          message: 'Version ID is required',
          code: 'bad_request'
        });
      }

      // Get the status from the request body
      const { status } = req.body;

      // Validate the request
      if (!status) {
        return res.status(400).json({
          status: 'error',
          message: 'Status is required',
          code: 'bad_request'
        });
      }

      // Get the storage adapter
      const storageAdapter = StorageAdapterFactory.getStorageAdapter();

      // Get the KEK version
      const kekVersionStr = await storageAdapter.get(`kek_version:${tenantId}:${id}`);

      // If the KEK version doesn't exist, return 404
      if (!kekVersionStr) {
        return res.status(404).json({
          status: 'error',
          message: 'KEK version not found',
          code: 'not_found'
        });
      }

      // Parse the KEK version
      const kekVersion = JSON.parse(kekVersionStr);

      // Update the status
      kekVersion.status = status;

      // Store the updated KEK version
      await storageAdapter.set(`kek_version:${tenantId}:${id}`, JSON.stringify(kekVersion));

      // If the status is 'active', update any existing active versions to 'decrypt-only'
      if (status === 'active') {
        // Get all KEK versions
        const versions = await storageAdapter.list(`kek_version:${tenantId}:`);

        // Update any active versions to 'decrypt-only'
        for (const versionKey of versions) {
          // Skip the current version
          if (versionKey === `kek_version:${tenantId}:${id}`) {
            continue;
          }

          // Get the version
          const versionStr = await storageAdapter.get(versionKey);
          if (!versionStr) {
            continue;
          }

          // Parse the version
          const version = JSON.parse(versionStr);

          // If the version is active, update it to 'decrypt-only'
          if (version.status === 'active') {
            version.status = 'decrypt-only';
            await storageAdapter.set(versionKey, JSON.stringify(version));
          }
        }
      }

      // Return success
      return res.status(200).json({
        status: 'success',
        message: 'KEK version updated successfully',
        kekVersion
      });
    } catch (error) {
      logger.error('Error updating KEK version:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    }
  }
};
