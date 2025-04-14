import { Request, Response } from 'express';
import { LogService } from '../services/LogService';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';
import { validateRequest } from '../utils/validation';
import { z } from 'zod';

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
      // Validate request
      const schema = z.object({
        name: z.string(),
        description: z.string().optional(),
        retentionDays: z.number().positive().optional(),
        encryptionEnabled: z.boolean().optional()
      });

      const validatedData = validateRequest(req.body, schema);
      
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
      
      // Create the log
      const log = await this.logService.createLog(
        tenantId,
        validatedData.name,
        {
          description: validatedData.description,
          retentionDays: validatedData.retentionDays,
          encryptionEnabled: validatedData.encryptionEnabled
        }
      );
      
      res.status(201).json({
        status: 'success',
        log
      });
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
      const logs = await this.logService.getLogs(tenantId);
      
      res.status(200).json({
        status: 'success',
        logs
      });
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
      const log = await this.logService.getLog(tenantId, logName);
      
      res.status(200).json({
        status: 'success',
        log
      });
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
      
      // Validate request
      const schema = z.object({
        description: z.string().optional(),
        retentionDays: z.number().positive().optional(),
        encryptionEnabled: z.boolean().optional()
      });

      const validatedData = validateRequest(req.body, schema);
      
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
      
      // Update the log
      const log = await this.logService.updateLog(
        tenantId,
        logName,
        validatedData
      );
      
      res.status(200).json({
        status: 'success',
        log
      });
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
      await this.logService.deleteLog(tenantId, logName);
      
      res.status(200).json({
        status: 'success',
        message: 'Log deleted successfully'
      });
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
      
      // Validate request
      const schema = z.object({
        data: z.any(),
        searchTokens: z.array(z.string()).optional(),
        encryptionInfo: z.object({
          version: z.string(),
          algorithm: z.string()
        }).optional()
      });

      const validatedData = validateRequest(req.body, schema);
      
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
      
      // Append the log entry
      const result = await this.logService.appendLogEntry(
        tenantId,
        logName,
        validatedData.data,
        {
          searchTokens: validatedData.searchTokens,
          encryptionInfo: validatedData.encryptionInfo
        }
      );
      
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
        tenantId,
        logName,
        limit,
        offset
      );
      
      res.status(200).json({
        status: 'success',
        ...result
      });
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
        tenantId,
        logName,
        entryId
      );
      
      res.status(200).json({
        status: 'success',
        entry
      });
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
      
      // Validate request
      const schema = z.object({
        query: z.string().optional(),
        searchTokens: z.array(z.string()).optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        limit: z.number().positive().optional(),
        offset: z.number().nonnegative().optional()
      });

      const validatedData = validateRequest(req.body, schema);
      
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
      
      // Search the log entries
      const result = await this.logService.searchLogEntries(
        tenantId,
        logName,
        {
          query: validatedData.query,
          searchTokens: validatedData.searchTokens,
          startTime: validatedData.startTime,
          endTime: validatedData.endTime,
          limit: validatedData.limit || 10,
          offset: validatedData.offset || 0
        }
      );
      
      res.status(200).json({
        status: 'success',
        ...result
      });
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
   * Get log statistics
   * 
   * @param req Express request
   * @param res Express response
   */
  public getLogStatistics = async (req: Request, res: Response): Promise<void> => {
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
      
      // Verify the user has permission to get statistics for the log
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
      
      // Check if the user has permission to get statistics for the log
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
      
      // Get the log statistics
      const statistics = await this.logService.getLogStatistics(
        tenantId,
        logName
      );
      
      res.status(200).json({
        status: 'success',
        statistics
      });
    } catch (error) {
      logger.error('Error getting log statistics:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'get_log_statistics_failed'
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
      
      // Validate request
      const schema = z.object({
        entries: z.array(
          z.object({
            data: z.any(),
            searchTokens: z.array(z.string()).optional(),
            encryptionInfo: z.object({
              version: z.string(),
              algorithm: z.string()
            }).optional()
          })
        )
      });

      const validatedData = validateRequest(req.body, schema);
      
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
      
      // Batch append the log entries
      const result = await this.logService.batchAppendLogEntries(
        tenantId,
        logName,
        validatedData.entries
      );
      
      res.status(201).json({
        status: 'success',
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
