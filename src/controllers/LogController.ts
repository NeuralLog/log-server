import { Request, Response } from 'express';
import { LogService } from '../services/LogService';
import { AuthService } from '../services/AuthService';
import logger from '../utils/logger';
import { RetentionPolicyStore } from '../storage/RetentionPolicyStore';
import { Log, LogEntry, LogSearchOptions, PaginatedResult } from '@neurallog/client-sdk';

/**
 * Controller for log-related operations
 */
export class LogController {
  private logService: LogService;
  private authService: AuthService;

  /**
   * Create a new LogController
   *
   * @param logService Log service
   * @param authService Auth service
   */
  constructor(logService: LogService, authService: AuthService) {
    this.logService = logService;
    this.authService = authService;
  }

  /**
   * Create a new log
   *
   * @param req Express request
   * @param res Express response
   */
  public createLog = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to create logs
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to create logs
      const hasPermission = await this.authService.checkPermission(
        token,
        'create',
        `logs`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Pass the log data directly from the wire protocol
      // The OpenAPI validator has already validated the request body
      const log = await this.logService.createLog(req.body);

      // Apply the tenant's default retention policy to the new log if it exists
      try {
        const retentionPolicyStore = new RetentionPolicyStore();
        await retentionPolicyStore.initialize();

        // Get the tenant's default retention policy
        const defaultPolicy = await retentionPolicyStore.getRetentionPolicy(tenantId);

        if (defaultPolicy) {
          // Apply the default policy to the new log
          await retentionPolicyStore.setRetentionPolicy(
            tenantId,
            defaultPolicy.retentionPeriodMs,
            log.name
          );
          logger.info(`Applied default retention policy to new log ${log.name}`);
        }
      } catch (policyError) {
        // Log the error but don't fail the log creation
        logger.warn(`Failed to apply default retention policy to new log ${log.name}:`, policyError);
      }

      // Return the created log
      res.status(201).json(log);
    } catch (error) {
      logger.error('Error creating log:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'create_log_failed'
      });
    }
  };

  /**
   * Get logs
   *
   * @param req Express request
   * @param res Express response
   */
  public getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to get logs
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to get logs
      const hasPermission = await this.authService.checkPermission(
        token,
        'read',
        `logs`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Get the logs
      const logs = await this.logService.getLogs();

      // Return the logs
      res.status(200).json(logs);
    } catch (error) {
      logger.error('Error getting logs:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'get_logs_failed'
      });
    }
  };

  /**
   * Get a log by name
   *
   * @param req Express request
   * @param res Express response
   */
  public getLog = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get log name from request
      const logName = req.params.logName;
      if (!logName) {
        res.status(400).json({
          status: 'error',
          message: 'Missing log name',
          code: 'missing_log_name'
        });
        return;
      }

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to get the log
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to get the log
      const hasPermission = await this.authService.checkPermission(
        token,
        'read',
        `logs/${logName}`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Get the log
      const log = await this.logService.getLog(logName);

      // Return the log
      res.status(200).json(log);
    } catch (error) {
      logger.error('Error getting log:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'get_log_failed'
      });
    }
  };

  /**
   * Update a log
   *
   * @param req Express request
   * @param res Express response
   */
  public updateLog = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get log name from request
      const logName = req.params.logName;
      if (!logName) {
        res.status(400).json({
          status: 'error',
          message: 'Missing log name',
          code: 'missing_log_name'
        });
        return;
      }

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to update the log
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to update the log
      const hasPermission = await this.authService.checkPermission(
        token,
        'update',
        `logs/${logName}`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Get the existing log
      const existingLog = await this.logService.getLog(logName);
      if (!existingLog) {
        res.status(404).json({
          status: 'error',
          message: 'Log not found',
          code: 'log_not_found'
        });
        return;
      }

      // Pass the update data directly from the wire protocol
      // The OpenAPI validator has already validated the request body
      const log = await this.logService.updateLog({
        ...existingLog,
        ...req.body,
        name: logName // Ensure the name doesn't change
      });

      // Return the updated log
      res.status(200).json(log);
    } catch (error) {
      logger.error('Error updating log:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'update_log_failed'
      });
    }
  };

  /**
   * Delete a log
   *
   * @param req Express request
   * @param res Express response
   */
  public deleteLog = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get log name from request
      const logName = req.params.logName;
      if (!logName) {
        res.status(400).json({
          status: 'error',
          message: 'Missing log name',
          code: 'missing_log_name'
        });
        return;
      }

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to delete the log
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to delete the log
      const hasPermission = await this.authService.checkPermission(
        token,
        'delete',
        `logs/${logName}`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Delete the log
      await this.logService.deleteLog(logName);

      // Clean up any retention policies for this log
      try {
        const retentionPolicyStore = new RetentionPolicyStore();
        await retentionPolicyStore.initialize();

        // Delete the retention policy for this log
        await retentionPolicyStore.deleteRetentionPolicy(tenantId, logName);
        logger.info(`Deleted retention policy for log ${logName}`);
      } catch (policyError) {
        // Log the error but don't fail the log deletion
        logger.warn(`Failed to delete retention policy for log ${logName}:`, policyError);
      }

      // Return 204 No Content for successful deletion
      res.status(204).end();
    } catch (error) {
      logger.error('Error deleting log:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'delete_log_failed'
      });
    }
  };

  /**
   * Append a log entry
   *
   * @param req Express request
   * @param res Express response
   */
  public appendLogEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get log name from request
      const logName = req.params.logName;
      if (!logName) {
        res.status(400).json({
          status: 'error',
          message: 'Missing log name',
          code: 'missing_log_name'
        });
        return;
      }

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to append to the log
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to append to the log
      const hasPermission = await this.authService.checkPermission(
        token,
        'append',
        `logs/${logName}`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Pass the log entry data directly from the wire protocol
      // The OpenAPI validator has already validated the request body
      const result = await this.logService.appendLogEntry({
        ...req.body,
        logId: logName
      });

      res.status(201).json({
        status: 'success',
        id: result.id,
        timestamp: result.timestamp
      });
    } catch (error) {
      logger.error('Error appending log entry:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'append_log_entry_failed'
      });
    }
  };

  /**
   * Get log entries
   *
   * @param req Express request
   * @param res Express response
   */
  public getLogEntries = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get log name from request
      const logName = req.params.logName;
      if (!logName) {
        res.status(400).json({
          status: 'error',
          message: 'Missing log name',
          code: 'missing_log_name'
        });
        return;
      }

      // Validate query parameters
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to read the log
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to read the log
      const hasPermission = await this.authService.checkPermission(
        token,
        'read',
        `logs/${logName}`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Get the log entries
      const result = await this.logService.getLogEntries(
        logName,
        limit,
        offset
      );

      // Return the paginated log entries
      res.status(200).json(result);
    } catch (error) {
      logger.error('Error getting log entries:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'get_log_entries_failed'
      });
    }
  };

  /**
   * Get a log entry
   *
   * @param req Express request
   * @param res Express response
   */
  public getLogEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get log name and entry ID from request
      const logName = req.params.logName;
      const entryId = req.params.entryId;
      if (!logName) {
        res.status(400).json({
          status: 'error',
          message: 'Missing log name',
          code: 'missing_log_name'
        });
        return;
      }
      if (!entryId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing entry ID',
          code: 'missing_entry_id'
        });
        return;
      }

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to read the log
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to read the log
      const hasPermission = await this.authService.checkPermission(
        token,
        'read',
        `logs/${logName}`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Get the log entry
      const entry = await this.logService.getLogEntry(
        logName,
        entryId
      );

      // Return the log entry
      res.status(200).json(entry);
    } catch (error) {
      logger.error('Error getting log entry:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'get_log_entry_failed'
      });
    }
  };

  /**
   * Search log entries
   *
   * @param req Express request
   * @param res Express response
   */
  public searchLogEntries = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get log name from request
      const logName = req.params.logName;
      if (!logName) {
        res.status(400).json({
          status: 'error',
          message: 'Missing log name',
          code: 'missing_log_name'
        });
        return;
      }

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to search the log
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to search the log
      const hasPermission = await this.authService.checkPermission(
        token,
        'search',
        `logs/${logName}`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Pass the search options directly from the wire protocol
      // The OpenAPI validator has already validated the request body
      const result = await this.logService.searchLogEntries(logName, req.body);

      // Return the search results
      res.status(200).json(result);
    } catch (error) {
      logger.error('Error searching log entries:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'search_log_entries_failed'
      });
    }
  };



  /**
   * Batch append log entries
   *
   * @param req Express request
   * @param res Express response
   */
  public batchAppendLogEntries = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get log name from request
      const logName = req.params.logName;
      if (!logName) {
        res.status(400).json({
          status: 'error',
          message: 'Missing log name',
          code: 'missing_log_name'
        });
        return;
      }

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to append to the log
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to append to the log
      const hasPermission = await this.authService.checkPermission(
        token,
        'append',
        `logs/${logName}`
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Prepare log entries with proper structure
      // Add logId to each entry
      const entries = req.body.entries.map((entry: any) => ({
        ...entry,
        logId: logName
      }));

      // Batch append the log entries
      // The OpenAPI validator has already validated the request body
      const result = await this.logService.batchAppendLogEntries(logName, entries);

      // Return the batch append result
      res.status(201).json({
        count: result.entries.length,
        entries: result.entries
      });
    } catch (error) {
      logger.error('Error batch appending log entries:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'batch_append_log_entries_failed'
      });
    }
  };
}
