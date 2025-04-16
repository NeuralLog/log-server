import logger from '../utils/logger';
import { RetentionPolicyStore } from '../storage/RetentionPolicyStore';
import { StorageAdapterFactory } from '../storage/StorageAdapterFactory';
import { ConfigService } from './ConfigService';

/**
 * Result of a purge operation
 */
export interface PurgeResult {
  success: boolean;
  purgedCount: number;
  error?: string;
}

/**
 * Result of purging all tenants
 */
export interface PurgeAllResult {
  success: boolean;
  totalPurged: number;
  results?: Record<string, PurgeResult>;
  error?: string;
}

/**
 * Service for managing data retention
 */
export class DataRetentionService {
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
   * Purge expired logs for a tenant
   *
   * @param tenantId Tenant ID
   * @param batchSize Maximum number of logs to purge in one batch
   * @returns Result of the purge operation
   */
  public async purgeExpiredLogs(
    tenantId: string,
    batchSize: number = 1000
  ): Promise<PurgeResult> {
    try {
      logger.info(`Purging expired logs for tenant ${tenantId}`);

      // Get the tenant's retention policy
      const policy = await this.retentionPolicyStore.getRetentionPolicy(tenantId);

      // If no policy exists or retention is unlimited, nothing to do
      if (!policy || policy.retentionPeriodMs === -1) {
        logger.info(`No retention policy or unlimited retention for tenant ${tenantId}`);
        return { success: true, purgedCount: 0 };
      }

      // Get the storage adapter for this tenant
      const storageAdapter = this.storageAdapterFactory.createAdapter(tenantId);

      // Find and delete expired log entries
      const cutoffTime = Date.now() - policy.retentionPeriodMs;
      const result = await storageAdapter.purgeExpiredLogs(cutoffTime, batchSize);

      if (result.purgedCount === 0) {
        logger.info(`No expired logs found for tenant ${tenantId}`);
        return { success: true, purgedCount: 0 };
      }

      logger.info(`Purged ${result.purgedCount} expired logs for tenant ${tenantId}`);

      return {
        success: true,
        purgedCount: result.purgedCount
      };
    } catch (error) {
      logger.error(`Error purging expired logs for tenant ${tenantId}:`, error);
      return {
        success: false,
        purgedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Purge expired logs for all tenants
   *
   * @param batchSize Maximum number of logs to purge in one batch
   * @returns Result of the purge operation
   */
  public async purgeAllTenants(batchSize: number = 1000): Promise<PurgeAllResult> {
    try {
      logger.info('Purging expired logs for all tenants');

      // Get all tenants with retention policies
      const tenants = await this.retentionPolicyStore.getAllTenantsWithPolicies();

      const results: Record<string, PurgeResult> = {};
      let totalPurged = 0;

      // Process each tenant
      for (const tenantId of tenants) {
        const result = await this.purgeExpiredLogs(tenantId, batchSize);
        results[tenantId] = result;

        if (result.success) {
          totalPurged += result.purgedCount;
        }
      }

      logger.info(`Purged ${totalPurged} expired logs across all tenants`);

      return {
        success: true,
        totalPurged,
        results
      };
    } catch (error) {
      logger.error(`Error purging all tenants:`, error);
      return {
        success: false,
        totalPurged: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
