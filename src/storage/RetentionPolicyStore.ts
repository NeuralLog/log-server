import Datastore from 'nedb';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import configService from '../services/ConfigService';

/**
 * Retention policy interface
 */
export interface RetentionPolicy {
  tenantId: string;
  logName?: string;  // Optional - if not provided, this is the tenant-wide default policy
  retentionPeriodMs: number;  // -1 for unlimited retention
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Store for managing retention policies
 */
export class RetentionPolicyStore {
  private db: Datastore;
  private initialized: boolean = false;

  /**
   * Constructor
   *
   * @param dbPath Path to the database directory
   */
  constructor(private dbPath: string = './data') {
    // Create the database directory if it doesn't exist
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }

    // Create the retention policies directory if it doesn't exist
    const retentionPoliciesDir = path.join(this.dbPath, 'retention-policies');
    if (!fs.existsSync(retentionPoliciesDir)) {
      fs.mkdirSync(retentionPoliciesDir, { recursive: true });
    }

    // Initialize NeDB datastore
    this.db = new Datastore({
      filename: path.join(retentionPoliciesDir, 'policies.db'),
      autoload: true
    });

    // Create index on tenantId for faster queries
    this.db.ensureIndex({ fieldName: 'tenantId', unique: true });

    this.initialized = true;
  }

  /**
   * Get the retention policy for a tenant and log
   *
   * @param tenantId Tenant ID
   * @param logName Optional log name (encrypted) - if not provided, returns the tenant-wide default policy
   * @returns Retention policy or null if not found
   */
  public async getRetentionPolicy(tenantId: string, logName?: string): Promise<RetentionPolicy | null> {
    return new Promise((resolve, reject) => {
      const query = logName ? { tenantId, logName } : { tenantId, logName: { $exists: false } };

      this.db.findOne(query, (err, doc) => {
        if (err) {
          logger.error(`Error getting retention policy for tenant ${tenantId}${logName ? ` and log ${logName}` : ''}:`, err);
          return reject(err);
        }

        if (!doc) {
          // If we were looking for a specific log policy and didn't find it,
          // fall back to the tenant-wide default policy
          if (logName) {
            return this.getRetentionPolicy(tenantId)
              .then(resolve)
              .catch(reject);
          }
          return resolve(null);
        }

        resolve({
          tenantId: doc.tenantId,
          logName: doc.logName,
          retentionPeriodMs: doc.retentionPeriodMs,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          createdBy: doc.createdBy,
          updatedBy: doc.updatedBy
        });
      });
    });
  }

  /**
   * Set the retention policy for a tenant or specific log
   *
   * @param tenantId Tenant ID
   * @param retentionPeriodMs Retention period in milliseconds
   * @param logName Optional log name (encrypted) - if not provided, sets the tenant-wide default policy
   * @returns The updated or created retention policy
   */
  public async setRetentionPolicy(
    tenantId: string,
    retentionPeriodMs: number,
    logName?: string
  ): Promise<RetentionPolicy> {
    // Get the maximum allowed retention period from config
    const maxRetentionPeriodMs = configService.getMaxRetentionPeriodMs();

    // Ensure the retention period is within the allowed range
    if (maxRetentionPeriodMs !== -1 && retentionPeriodMs > maxRetentionPeriodMs) {
      throw new Error(`Retention period exceeds maximum allowed value of ${maxRetentionPeriodMs} ms`);
    }

    // Check if a policy already exists
    const existingPolicy = await this.getRetentionPolicy(tenantId, logName);

    const now = new Date();

    if (existingPolicy) {
      // Update existing policy
      return new Promise((resolve, reject) => {
        const query = logName ? { tenantId, logName } : { tenantId, logName: { $exists: false } };

        this.db.update(
          query,
          {
            $set: {
              retentionPeriodMs,
              updatedAt: now,
              updatedBy: userId
            }
          },
          {},
          (err) => {
            if (err) {
              logger.error(`Error updating retention policy for tenant ${tenantId}${logName ? ` and log ${logName}` : ''}:`, err);
              return reject(err);
            }

            resolve({
              tenantId,
              logName,
              retentionPeriodMs,
              createdAt: existingPolicy.createdAt,
              updatedAt: now,
              createdBy: existingPolicy.createdBy,
              updatedBy: userId
            });
          }
        );
      });
    } else {
      // Create new policy
      const policy: RetentionPolicy = {
        tenantId,
        retentionPeriodMs,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId
      };

      // Add logName if provided
      if (logName) {
        policy.logName = logName;
      }

      return new Promise((resolve, reject) => {
        this.db.insert(policy, (err) => {
          if (err) {
            logger.error(`Error creating retention policy for tenant ${tenantId}${logName ? ` and log ${logName}` : ''}:`, err);
            return reject(err);
          }

          resolve(policy);
        });
      });
    }
  }

  /**
   * Delete the retention policy for a tenant or specific log
   *
   * @param tenantId Tenant ID
   * @param logName Optional log name (encrypted) - if not provided, deletes the tenant-wide default policy
   */
  public async deleteRetentionPolicy(tenantId: string, logName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = logName ? { tenantId, logName } : { tenantId, logName: { $exists: false } };

      this.db.remove(query, {}, (err) => {
        if (err) {
          logger.error(`Error deleting retention policy for tenant ${tenantId}${logName ? ` and log ${logName}` : ''}:`, err);
          return reject(err);
        }

        resolve();
      });
    });
  }

  /**
   * Get all tenants with retention policies
   *
   * @returns Array of tenant IDs
   */
  public async getAllTenantsWithPolicies(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.find({}, { tenantId: 1, _id: 0 }, (err, docs) => {
        if (err) {
          logger.error('Error getting tenants with policies:', err);
          return reject(err);
        }

        // Get unique tenant IDs
        const tenantIds = [...new Set(docs.map(doc => doc.tenantId))];
        resolve(tenantIds);
      });
    });
  }

  /**
   * Get all logs with retention policies for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Array of log names (encrypted)
   */
  public async getLogsWithPolicies(tenantId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.find({ tenantId, logName: { $exists: true } }, { logName: 1, _id: 0 }, (err, docs) => {
        if (err) {
          logger.error(`Error getting logs with policies for tenant ${tenantId}:`, err);
          return reject(err);
        }

        resolve(docs.map(doc => doc.logName));
      });
    });
  }

  /**
   * Get all retention policies for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Array of retention policies
   */
  public async getAllRetentionPolicies(tenantId: string): Promise<RetentionPolicy[]> {
    return new Promise((resolve, reject) => {
      this.db.find({ tenantId }, (err, docs) => {
        if (err) {
          logger.error(`Error getting all retention policies for tenant ${tenantId}:`, err);
          return reject(err);
        }

        resolve(docs.map(doc => ({
          tenantId: doc.tenantId,
          logName: doc.logName,
          retentionPeriodMs: doc.retentionPeriodMs,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          createdBy: doc.createdBy,
          updatedBy: doc.updatedBy
        })));
      });
    });
  }

  /**
   * Get all retention policies for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Array of retention policies
   */
  public async getAllRetentionPolicies(tenantId: string): Promise<RetentionPolicy[]> {
    return new Promise((resolve, reject) => {
      this.db.find({ tenantId }, (err, docs) => {
        if (err) {
          logger.error(`Error getting all retention policies for tenant ${tenantId}:`, err);
          return reject(err);
        }

        resolve(docs.map(doc => ({
          tenantId: doc.tenantId,
          logName: doc.logName,
          retentionPeriodMs: doc.retentionPeriodMs,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          createdBy: doc.createdBy,
          updatedBy: doc.updatedBy
        })));
      });
    });
  }
}
