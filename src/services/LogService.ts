import { StorageAdapter } from '../storage/StorageAdapter';
import { 
  Log, 
  LogEntry, 
  LogCreateOptions, 
  LogUpdateOptions, 
  LogEntryOptions, 
  LogSearchOptions, 
  LogStatistics,
  PaginatedResult,
  BatchAppendResult
} from '../types';
import { logger } from '../utils/logger';
import { LogError } from '../errors/LogError';

/**
 * Service for log operations
 */
export class LogService {
  private storageAdapter: StorageAdapter;

  /**
   * Create a new LogService
   * 
   * @param storageAdapter Storage adapter
   */
  constructor(storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter;
  }

  /**
   * Create a new log
   * 
   * @param tenantId Tenant ID
   * @param name Log name
   * @param options Log creation options
   * @returns Promise that resolves to the created log
   */
  public async createLog(
    tenantId: string,
    name: string,
    options: LogCreateOptions = {}
  ): Promise<Log> {
    try {
      logger.debug(`Creating log ${name} for tenant ${tenantId}`);
      
      // Create the log
      const log = await this.storageAdapter.createLog(tenantId, {
        name,
        description: options.description || '',
        retentionDays: options.retentionDays || 30,
        encryptionEnabled: options.encryptionEnabled !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      logger.info(`Created log ${name} for tenant ${tenantId}`);
      return log;
    } catch (error) {
      logger.error(`Failed to create log ${name} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to create log: ${error instanceof Error ? error.message : String(error)}`,
        'create_log_failed'
      );
    }
  }

  /**
   * Get logs for a tenant
   * 
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the logs
   */
  public async getLogs(tenantId: string): Promise<Log[]> {
    try {
      logger.debug(`Getting logs for tenant ${tenantId}`);
      
      // Get the logs
      const logs = await this.storageAdapter.getLogs(tenantId);
      
      logger.debug(`Got ${logs.length} logs for tenant ${tenantId}`);
      return logs;
    } catch (error) {
      logger.error(`Failed to get logs for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to get logs: ${error instanceof Error ? error.message : String(error)}`,
        'get_logs_failed'
      );
    }
  }

  /**
   * Get a log by name
   * 
   * @param tenantId Tenant ID
   * @param name Log name
   * @returns Promise that resolves to the log
   */
  public async getLog(tenantId: string, name: string): Promise<Log> {
    try {
      logger.debug(`Getting log ${name} for tenant ${tenantId}`);
      
      // Get the log
      const log = await this.storageAdapter.getLog(tenantId, name);
      
      logger.debug(`Got log ${name} for tenant ${tenantId}`);
      return log;
    } catch (error) {
      logger.error(`Failed to get log ${name} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to get log: ${error instanceof Error ? error.message : String(error)}`,
        'get_log_failed'
      );
    }
  }

  /**
   * Update a log
   * 
   * @param tenantId Tenant ID
   * @param name Log name
   * @param options Log update options
   * @returns Promise that resolves to the updated log
   */
  public async updateLog(
    tenantId: string,
    name: string,
    options: LogUpdateOptions
  ): Promise<Log> {
    try {
      logger.debug(`Updating log ${name} for tenant ${tenantId}`);
      
      // Update the log
      const log = await this.storageAdapter.updateLog(tenantId, name, {
        ...options,
        updatedAt: new Date().toISOString()
      });
      
      logger.info(`Updated log ${name} for tenant ${tenantId}`);
      return log;
    } catch (error) {
      logger.error(`Failed to update log ${name} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to update log: ${error instanceof Error ? error.message : String(error)}`,
        'update_log_failed'
      );
    }
  }

  /**
   * Delete a log
   * 
   * @param tenantId Tenant ID
   * @param name Log name
   * @returns Promise that resolves when the log is deleted
   */
  public async deleteLog(tenantId: string, name: string): Promise<void> {
    try {
      logger.debug(`Deleting log ${name} for tenant ${tenantId}`);
      
      // Delete the log
      await this.storageAdapter.deleteLog(tenantId, name);
      
      logger.info(`Deleted log ${name} for tenant ${tenantId}`);
    } catch (error) {
      logger.error(`Failed to delete log ${name} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to delete log: ${error instanceof Error ? error.message : String(error)}`,
        'delete_log_failed'
      );
    }
  }

  /**
   * Append a log entry
   * 
   * @param tenantId Tenant ID
   * @param logName Log name
   * @param data Log entry data
   * @param options Log entry options
   * @returns Promise that resolves to the log entry ID
   */
  public async appendLogEntry(
    tenantId: string,
    logName: string,
    data: any,
    options: LogEntryOptions = {}
  ): Promise<{ id: string; timestamp: string }> {
    try {
      logger.debug(`Appending log entry to ${logName} for tenant ${tenantId}`);
      
      // Create the log entry
      const timestamp = new Date().toISOString();
      const entry: LogEntry = {
        id: '', // Will be set by the storage adapter
        timestamp,
        data,
        searchTokens: options.searchTokens || [],
        encryptionInfo: options.encryptionInfo || {
          version: 'v1',
          algorithm: 'none'
        }
      };
      
      // Append the log entry
      const id = await this.storageAdapter.appendLogEntry(tenantId, logName, entry);
      
      logger.debug(`Appended log entry ${id} to ${logName} for tenant ${tenantId}`);
      return { id, timestamp };
    } catch (error) {
      logger.error(`Failed to append log entry to ${logName} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to append log entry: ${error instanceof Error ? error.message : String(error)}`,
        'append_log_entry_failed'
      );
    }
  }

  /**
   * Get log entries
   * 
   * @param tenantId Tenant ID
   * @param logName Log name
   * @param limit Maximum number of entries to return
   * @param offset Offset for pagination
   * @returns Promise that resolves to the log entries
   */
  public async getLogEntries(
    tenantId: string,
    logName: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaginatedResult<LogEntry>> {
    try {
      logger.debug(`Getting log entries for ${logName} for tenant ${tenantId}`);
      
      // Get the log entries
      const result = await this.storageAdapter.getLogEntries(tenantId, logName, {
        limit,
        offset
      });
      
      logger.debug(`Got ${result.entries.length} log entries for ${logName} for tenant ${tenantId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to get log entries for ${logName} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to get log entries: ${error instanceof Error ? error.message : String(error)}`,
        'get_log_entries_failed'
      );
    }
  }

  /**
   * Get a log entry
   * 
   * @param tenantId Tenant ID
   * @param logName Log name
   * @param entryId Log entry ID
   * @returns Promise that resolves to the log entry
   */
  public async getLogEntry(
    tenantId: string,
    logName: string,
    entryId: string
  ): Promise<LogEntry> {
    try {
      logger.debug(`Getting log entry ${entryId} for ${logName} for tenant ${tenantId}`);
      
      // Get the log entry
      const entry = await this.storageAdapter.getLogEntry(tenantId, logName, entryId);
      
      logger.debug(`Got log entry ${entryId} for ${logName} for tenant ${tenantId}`);
      return entry;
    } catch (error) {
      logger.error(`Failed to get log entry ${entryId} for ${logName} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to get log entry: ${error instanceof Error ? error.message : String(error)}`,
        'get_log_entry_failed'
      );
    }
  }

  /**
   * Search log entries
   * 
   * @param tenantId Tenant ID
   * @param logName Log name
   * @param options Search options
   * @returns Promise that resolves to the search results
   */
  public async searchLogEntries(
    tenantId: string,
    logName: string,
    options: LogSearchOptions
  ): Promise<PaginatedResult<LogEntry>> {
    try {
      logger.debug(`Searching log entries for ${logName} for tenant ${tenantId}`);
      
      // Search the log entries
      const result = await this.storageAdapter.searchLogEntries(tenantId, logName, options);
      
      logger.debug(`Found ${result.entries.length} log entries for ${logName} for tenant ${tenantId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to search log entries for ${logName} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to search log entries: ${error instanceof Error ? error.message : String(error)}`,
        'search_log_entries_failed'
      );
    }
  }

  /**
   * Get log statistics
   * 
   * @param tenantId Tenant ID
   * @param logName Log name
   * @returns Promise that resolves to the log statistics
   */
  public async getLogStatistics(
    tenantId: string,
    logName: string
  ): Promise<LogStatistics> {
    try {
      logger.debug(`Getting statistics for ${logName} for tenant ${tenantId}`);
      
      // Get the log statistics
      const statistics = await this.storageAdapter.getLogStatistics(tenantId, logName);
      
      logger.debug(`Got statistics for ${logName} for tenant ${tenantId}`);
      return statistics;
    } catch (error) {
      logger.error(`Failed to get statistics for ${logName} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to get log statistics: ${error instanceof Error ? error.message : String(error)}`,
        'get_log_statistics_failed'
      );
    }
  }

  /**
   * Get aggregated statistics for all logs
   * 
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the aggregated statistics
   */
  public async getAggregatedStatistics(tenantId: string): Promise<any> {
    try {
      logger.debug(`Getting aggregated statistics for tenant ${tenantId}`);
      
      // Get the aggregated statistics
      const statistics = await this.storageAdapter.getAggregatedStatistics(tenantId);
      
      logger.debug(`Got aggregated statistics for tenant ${tenantId}`);
      return statistics;
    } catch (error) {
      logger.error(`Failed to get aggregated statistics for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to get aggregated statistics: ${error instanceof Error ? error.message : String(error)}`,
        'get_aggregated_statistics_failed'
      );
    }
  }

  /**
   * Batch append log entries
   * 
   * @param tenantId Tenant ID
   * @param logName Log name
   * @param entries Log entries
   * @returns Promise that resolves to the batch append result
   */
  public async batchAppendLogEntries(
    tenantId: string,
    logName: string,
    entries: Array<{
      data: any;
      searchTokens?: string[];
      encryptionInfo?: {
        version: string;
        algorithm: string;
      };
    }>
  ): Promise<BatchAppendResult> {
    try {
      logger.debug(`Batch appending ${entries.length} log entries to ${logName} for tenant ${tenantId}`);
      
      // Create the log entries
      const timestamp = new Date().toISOString();
      const logEntries: LogEntry[] = entries.map(entry => ({
        id: '', // Will be set by the storage adapter
        timestamp,
        data: entry.data,
        searchTokens: entry.searchTokens || [],
        encryptionInfo: entry.encryptionInfo || {
          version: 'v1',
          algorithm: 'none'
        }
      }));
      
      // Batch append the log entries
      const result = await this.storageAdapter.batchAppendLogEntries(tenantId, logName, logEntries);
      
      logger.debug(`Batch appended ${result.entries.length} log entries to ${logName} for tenant ${tenantId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to batch append log entries to ${logName} for tenant ${tenantId}:`, error);
      throw new LogError(
        `Failed to batch append log entries: ${error instanceof Error ? error.message : String(error)}`,
        'batch_append_log_entries_failed'
      );
    }
  }
}
