import { Request, Response } from 'express';
import logger from '../utils/logger';
import { RetentionPolicyStore } from '../storage/RetentionPolicyStore';
import { StorageAdapterFactory } from '../storage/StorageAdapterFactory';
import { ConfigService } from '../services/ConfigService';

/**
 * Controller for managing retention policies
 */
export class RetentionPolicyController {
  /**
   * Constructor
   *
   * @param retentionPolicyStore Store for retention policies
   * @param configService Configuration service
   * @param storageAdapterFactory Factory for creating storage adapters
   */
  constructor(
    private retentionPolicyStore: RetentionPolicyStore,
    private configService: ConfigService,
    private storageAdapterFactory: StorageAdapterFactory
  ) {}

  /**
   * Get the retention policy for a tenant or specific log
   */
  public getRetentionPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get tenant ID from header
      const tenantId = req.headers['x-tenant-id'] as string;
      // Get log name from query parameter (optional)
      const logName = req.query.logName as string | undefined;

      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Tenant ID is required',
          code: 'tenant_id_required'
        });
        return;
      }

      // Get the retention policy
      const policy = await this.retentionPolicyStore.getRetentionPolicy(tenantId, logName);

      if (!policy) {
        res.status(404).json({
          status: 'error',
          message: 'Retention policy not found',
          code: 'policy_not_found'
        });
        return;
      }

      // Return the policy
      res.status(200).json(policy);
    } catch (error) {
      logger.error(`Error getting retention policy: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get retention policy',
        code: 'get_policy_failed'
      });
    }
  };

  /**
   * Set the retention policy for a tenant or specific log
   */
  public setRetentionPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get tenant ID from header
      const tenantId = req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Tenant ID is required',
          code: 'tenant_id_required'
        });
        return;
      }

      // Get retention period and optional log name from request body
      const { retentionPeriodMs, logName } = req.body;

      // Validate retention period
      if (retentionPeriodMs === undefined) {
        res.status(400).json({
          status: 'error',
          message: 'Retention period is required',
          code: 'retention_period_required'
        });
        return;
      }

      // Get the maximum allowed retention period
      const maxRetentionPeriodMs = this.configService.getMaxRetentionPeriodMs();

      // Check if the retention period exceeds the maximum allowed value
      if (maxRetentionPeriodMs !== -1 && retentionPeriodMs > maxRetentionPeriodMs) {
        res.status(400).json({
          status: 'error',
          message: `Retention period exceeds maximum allowed value of ${maxRetentionPeriodMs} ms`,
          code: 'retention_period_too_large'
        });
        return;
      }

      // Set the retention policy
      const policy = await this.retentionPolicyStore.setRetentionPolicy(
        tenantId,
        retentionPeriodMs,
        logName
      );

      // Return the updated policy
      res.status(200).json(policy);
    } catch (error) {
      logger.error(`Error setting retention policy: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to set retention policy',
        code: 'set_policy_failed'
      });
    }
  };

  /**
   * Delete the retention policy for a tenant or specific log
   */
  public deleteRetentionPolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get tenant ID from header
      const tenantId = req.headers['x-tenant-id'] as string;
      // Get log name from query parameter (optional)
      const logName = req.query.logName as string | undefined;

      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Tenant ID is required',
          code: 'tenant_id_required'
        });
        return;
      }

      // Delete the retention policy
      await this.retentionPolicyStore.deleteRetentionPolicy(tenantId, logName);

      // Return 204 No Content for successful deletion
      res.status(204).end();
    } catch (error) {
      logger.error(`Error deleting retention policy: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete retention policy',
        code: 'delete_policy_failed'
      });
    }
  };

  /**
   * Get all retention policies for a tenant
   */
  public getAllRetentionPolicies = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get tenant ID from header
      const tenantId = req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Tenant ID is required',
          code: 'tenant_id_required'
        });
        return;
      }

      // Get all retention policies
      const policies = await this.retentionPolicyStore.getAllRetentionPolicies(tenantId);

      // Return the policies
      res.status(200).json(policies);
    } catch (error) {
      logger.error(`Error getting all retention policies: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get all retention policies',
        code: 'get_all_policies_failed'
      });
    }
  };

  /**
   * Get the count of logs that would be affected by a retention policy change
   */
  public getExpiredLogsCount = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get tenant ID from header
      const tenantId = req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Tenant ID is required',
          code: 'tenant_id_required'
        });
        return;
      }

      // Get retention period from query parameter
      const retentionPeriodMs = req.query.retentionPeriodMs ? parseInt(req.query.retentionPeriodMs as string) : undefined;

      if (retentionPeriodMs === undefined) {
        res.status(400).json({
          status: 'error',
          message: 'Retention period is required',
          code: 'retention_period_required'
        });
        return;
      }

      // Get the storage adapter for this tenant
      const storageAdapter = this.storageAdapterFactory.createAdapter(tenantId);

      // Calculate the cutoff time
      const cutoffTime = Date.now() - retentionPeriodMs;

      // Get the count of expired logs
      const count = await storageAdapter.countExpiredLogs(cutoffTime);

      // Return the count
      res.status(200).json({ count });
    } catch (error) {
      logger.error(`Error getting expired logs count: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get expired logs count',
        code: 'get_expired_count_failed'
      });
    }
  };
}

// Export the controller class
export { RetentionPolicyController };
