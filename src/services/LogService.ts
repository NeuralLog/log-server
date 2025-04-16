import { StorageAdapter } from '../storage/StorageAdapter';
import {
  Log,
  LogEntry,
  LogSearchOptions,
  PaginatedResult,
  BatchAppendResult
} from '@neurallog/client-sdk/dist/types/api';
import logger from '../utils/logger';
// Create a LogError class
class LogError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'LogError';
    this.code = code;
  }
}

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
   * Get tenant ID from context
   *
   * @returns Tenant ID from the current request context
   * @private
   */
  private getTenantIdFromContext(): string {
    // In a real implementation, this would get the tenant ID from the request context
    // For now, we'll use a placeholder value
    return 'default-tenant';
  }

  /**
   * Create a new log
   *
   * @param log Complete Log object
   * @returns Promise that resolves to the created log
   */
  public async createLog(log: Log): Promise<Log> {
    try {
      logger.debug(`Creating log ${log.name}`);

      // Create the log
      const createdLog = await this.storageAdapter.createLog(log);

      logger.info(`Created log ${log.name}`);
      return createdLog;
    } catch (error) {
      logger.error(`Failed to create log ${log.name}:`, error);
      throw new LogError(
        `Failed to create log: ${error instanceof Error ? error.message : String(error)}`,
        'create_log_failed'
      );
    }
  }

  /**
   * Get logs
   *
   * @returns Promise that resolves to the logs
   */
  public async getLogs(): Promise<Log[]> {
    try {
      logger.debug(`Getting logs`);

      // Get the logs
      const logs = await this.storageAdapter.getLogs();

      logger.debug(`Got ${logs.length} logs`);
      return logs;
    } catch (error) {
      logger.error(`Failed to get logs:`, error);
      throw new LogError(
        `Failed to get logs: ${error instanceof Error ? error.message : String(error)}`,
        'get_logs_failed'
      );
    }
  }

  /**
   * Get a log by name
   *
   * @param name Log name
   * @returns Promise that resolves to the log
   */
  public async getLog(name: string): Promise<Log> {
    try {
      logger.debug(`Getting log ${name}`);

      // Get the log
      const log = await this.storageAdapter.getLog(name);

      logger.debug(`Got log ${name}`);
      return log as Log;
    } catch (error) {
      logger.error(`Failed to get log ${name}:`, error);
      throw new LogError(
        `Failed to get log: ${error instanceof Error ? error.message : String(error)}`,
        'get_log_failed'
      );
    }
  }

  /**
   * Update a log
   *
   * @param log Complete Log object
   * @returns Promise that resolves to the updated log
   */
  public async updateLog(log: Log): Promise<Log> {
    try {
      const name = log.name;
      logger.debug(`Updating log ${name}`);

      // Update the log
      const updatedLog = await this.storageAdapter.updateLog(log);

      logger.info(`Updated log ${name}`);
      return updatedLog;
    } catch (error) {
      logger.error(`Failed to update log ${log.name}:`, error);
      throw new LogError(
        `Failed to update log: ${error instanceof Error ? error.message : String(error)}`,
        'update_log_failed'
      );
    }
  }

  /**
   * Delete a log
   *
   * @param name Log name
   * @returns Promise that resolves when the log is deleted
   */
  public async deleteLog(name: string): Promise<void> {
    try {
      logger.debug(`Deleting log ${name}`);

      // Delete the log
      await this.storageAdapter.deleteLog(name);

      logger.info(`Deleted log ${name}`);
    } catch (error) {
      logger.error(`Failed to delete log ${name}:`, error);
      throw new LogError(
        `Failed to delete log: ${error instanceof Error ? error.message : String(error)}`,
        'delete_log_failed'
      );
    }
  }

  /**
   * Append a log entry
   *
   * @param entry Complete LogEntry object
   * @returns Promise that resolves to the log entry ID and timestamp
   */
  public async appendLogEntry(entry: LogEntry): Promise<{ id: string; timestamp: string }> {
    try {
      const logName = entry.logId;
      logger.debug(`Appending log entry to ${logName}`);

      // Ensure the entry has a timestamp
      if (!entry.timestamp) {
        entry.timestamp = new Date().toISOString();
      }

      // Ensure the entry has an ID (will be set by storage adapter if empty)
      if (!entry.id) {
        entry.id = '';
      }

      // Append the log entry
      const id = await this.storageAdapter.appendLogEntry(logName, entry);

      logger.debug(`Appended log entry ${id} to ${logName}`);
      return { id, timestamp: entry.timestamp };
    } catch (error) {
      logger.error(`Failed to append log entry to ${entry.logId}:`, error);
      throw new LogError(
        `Failed to append log entry: ${error instanceof Error ? error.message : String(error)}`,
        'append_log_entry_failed'
      );
    }
  }

  /**
   * Get log entries
   *
   * @param logName Log name
   * @param limit Maximum number of entries to return
   * @param offset Offset for pagination
   * @returns Promise that resolves to the log entries
   */
  public async getLogEntries(
    logName: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaginatedResult<LogEntry>> {
    try {
      logger.debug(`Getting log entries for ${logName}`);

      // Get the log entries
      const result = await this.storageAdapter.getLogEntries(logName, {
        limit,
        offset
      });

      logger.debug(`Got ${result.entries?.length || 0} log entries for ${logName}`);
      return result;
    } catch (error) {
      logger.error(`Failed to get log entries for ${logName}:`, error);
      throw new LogError(
        `Failed to get log entries: ${error instanceof Error ? error.message : String(error)}`,
        'get_log_entries_failed'
      );
    }
  }

  /**
   * Get a log entry
   *
   * @param logName Log name
   * @param entryId Log entry ID
   * @returns Promise that resolves to the log entry
   */
  public async getLogEntry(
    logName: string,
    entryId: string
  ): Promise<LogEntry> {
    try {
      logger.debug(`Getting log entry ${entryId} for ${logName}`);

      // Get the log entry
      const entry = await this.storageAdapter.getLogEntry(logName, entryId);

      logger.debug(`Got log entry ${entryId} for ${logName}`);
      return entry as LogEntry;
    } catch (error) {
      logger.error(`Failed to get log entry ${entryId} for ${logName}:`, error);
      throw new LogError(
        `Failed to get log entry: ${error instanceof Error ? error.message : String(error)}`,
        'get_log_entry_failed'
      );
    }
  }

  /**
   * Search log entries
   *
   * @param logName Log name
   * @param options Search options
   * @returns Promise that resolves to the search results
   */
  public async searchLogEntries(
    logName: string,
    options: LogSearchOptions
  ): Promise<PaginatedResult<LogEntry>> {
    try {
      logger.debug(`Searching log entries for ${logName}`);

      // Search the log entries
      const result = await this.storageAdapter.searchLogEntries(logName, options);

      logger.debug(`Found ${result.entries?.length || 0} log entries for ${logName}`);
      return result;
    } catch (error) {
      logger.error(`Failed to search log entries for ${logName}:`, error);
      throw new LogError(
        `Failed to search log entries: ${error instanceof Error ? error.message : String(error)}`,
        'search_log_entries_failed'
      );
    }
  }



  /**
   * Batch append log entries
   *
   * @param logName Log name
   * @param entries Log entries
   * @returns Promise that resolves to the batch append result
   */
  public async batchAppendLogEntries(
    logName: string,
    entries: LogEntry[]
  ): Promise<BatchAppendResult> {
    try {
      logger.debug(`Batch appending ${entries.length} log entries to ${logName}`);

      // Ensure all entries have the correct logId
      const logEntries = entries.map(entry => ({
        ...entry,
        logId: logName,
        id: entry.id || '', // Will be set by the storage adapter if empty
        timestamp: entry.timestamp || new Date().toISOString() // Use provided timestamp or current time
      }));

      // Batch append the log entries
      const result = await this.storageAdapter.batchAppendLogEntries(logName, logEntries);

      logger.debug(`Batch appended ${result.entries?.length || 0} log entries to ${logName}`);
      return result;
    } catch (error) {
      logger.error(`Failed to batch append log entries to ${logName}:`, error);
      throw new LogError(
        `Failed to batch append log entries: ${error instanceof Error ? error.message : String(error)}`,
        'batch_append_log_entries_failed'
      );
    }
  }
}
