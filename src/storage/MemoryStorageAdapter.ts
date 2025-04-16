import { StorageAdapter } from './StorageAdapter';
import logger from '../utils/logger';
import { Log, LogEntry, LogSearchOptions, PaginatedResult, BatchAppendResult } from '@neurallog/client-sdk/dist/types/api';
import { v4 as uuidv4 } from 'uuid';

// Server namespace prefix for all data
const SERVER_NAMESPACE = 'logserver';

/**
 * Memory storage adapter for storing log entries
 */
export class MemoryStorageAdapter implements StorageAdapter {
  // Map of log names to log entries
  private logs: Map<string, LogEntry[]> = new Map();
  private initialized: boolean = false;
  private namespace: string;

  // Map of log entry IDs to creation timestamps for data retention
  private timestamps: Map<string, number> = new Map();

  // Tenant logs storage
  private tenantLogs: Map<string, Map<string, Log>> = new Map();
  private ensureInitialized = async (): Promise<void> => {
    if (!this.initialized) {
      await this.initialize();
    }
  };

  /**
   * Constructor
   *
   * @param namespace Namespace for this storage adapter
   */
  constructor(namespace: string = 'default') {
    this.namespace = namespace;
  }

  /**
   * Get the namespace for this storage adapter
   *
   * @returns The namespace for this storage adapter
   */
  public getNamespace(): string {
    return this.namespace;
  }

  /**
   * Get the results database name
   */
  public get resultsDb(): string {
    return 'memory';
  }

  /**
   * Initialize the storage adapter
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    this.initialized = true;
    logger.info(`Memory storage adapter initialized for ${SERVER_NAMESPACE}:${this.namespace}`);
  }

  /**
   * Store a log entry
   *
   * @param logId Log ID
   * @param logName Log name (already encrypted by the client)
   * @param encryptedData The encrypted log data from the client
   * @param searchTokens Optional search tokens for searchable encryption
   */
  public async storeLogEntry(logId: string, logName: string, encryptedData: any, searchTokens?: string[]): Promise<void> {
    try {
      await this.initialize();

      // Create the log entry
      const entry: LogEntry = {
        id: logId,
        logId: logName,
        data: encryptedData,
        timestamp: new Date().toISOString()
      };

      // Store the creation timestamp for data retention
      this.timestamps.set(`${logName}:${logId}`, Date.now());

      // Get or create the log array
      if (!this.logs.has(logName)) {
        this.logs.set(logName, []);
      }

      // Add the entry to the log
      const logEntries = this.logs.get(logName)!;
      logEntries.push(entry);

      logger.info(`Stored log entry: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
    } catch (error) {
      logger.error(`Error storing log entry: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get a log entry by ID
   *
   * @param logName Log name
   * @param logId Log ID
   * @returns Log entry or null if not found
   */
  public async getLogEntryById(logName: string, logId: string): Promise<LogEntry | null> {
    try {
      await this.initialize();

      // Get the log entries
      const logEntries = this.logs.get(logName) || [];

      // Find the entry with the specified ID
      const entry = logEntries.find(entry => entry.id === logId);

      if (entry) {
        logger.info(`Retrieved log entry: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
        return entry;
      } else {
        logger.info(`Log entry not found: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error getting log entry by ID: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Update a log entry by ID
   *
   * @param logName Log name
   * @param logId Log ID
   * @param logData Log data
   * @returns True if the log entry was updated, false if it didn't exist
   */
  public async updateLogEntryById(logName: string, logId: string, logData: any): Promise<boolean> {
    try {
      await this.initialize();

      // Get the log entries
      const logEntries = this.logs.get(logName) || [];

      // Find the index of the entry with the specified ID
      const index = logEntries.findIndex(entry => entry.id === logId);

      if (index === -1) {
        logger.info(`Log entry not found for update: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
        return false;
      }

      // Update the entry
      logEntries[index] = {
        ...logEntries[index],
        data: logData,
        timestamp: new Date().toISOString()
      };

      logger.info(`Updated log entry: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
      return true;
    } catch (error) {
      logger.error(`Error updating log entry: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Delete a log entry by ID
   *
   * @param logName Log name
   * @param logId Log ID
   * @returns True if the log entry was deleted, false if it didn't exist
   */
  public async deleteLogEntryById(logName: string, logId: string): Promise<boolean> {
    try {
      await this.initialize();

      // Get the log entries
      const logEntries = this.logs.get(logName) || [];

      // Find the index of the entry with the specified ID
      const index = logEntries.findIndex(entry => entry.id === logId);

      if (index === -1) {
        logger.info(`Log entry not found for deletion: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
        return false;
      }

      // Remove the entry
      logEntries.splice(index, 1);

      // Remove the timestamp
      this.timestamps.delete(`${logName}:${logId}`);

      logger.info(`Deleted log entry: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting log entry: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get logs by name
   *
   * @param logName Log name
   * @param limit Maximum number of logs to return
   * @returns Logs
   */
  public async getLogsByName(logName: string, limit: number = 100): Promise<any[]> {
    try {
      // Get the log entries
      const logEntries = this.logs.get(logName) || [];

      // We don't sort by timestamp in a zero-knowledge system
      // as timestamps are encrypted on the client side
      const sortedEntries = [...logEntries].slice(0, limit);

      logger.info(`Retrieved ${sortedEntries.length} entries for log: ${logName}, namespace: ${this.namespace}`);
      return sortedEntries;
    } catch (error) {
      logger.error(`Error getting logs by name: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get all log names
   *
   * @param limit Maximum number of log names to return (default: 1000)
   * @returns Array of log names
   */
  public async getLogNames(limit: number = 1000): Promise<string[]> {
    try {
      // Get all log names
      const logNames = Array.from(this.logs.keys());

      // Limit the number of log names if needed
      const limitedLogNames = logNames.slice(0, limit);

      logger.info(`Retrieved ${limitedLogNames.length} log names, namespace: ${this.namespace}`);
      return limitedLogNames;
    } catch (error) {
      logger.error(`Error getting log names: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Clear a log
   *
   * @param logName Log name
   * @returns True if the log was cleared, false if it didn't exist
   */
  public async clearLog(logName: string): Promise<boolean> {
    try {
      await this.initialize();

      // Check if the log exists
      if (!this.logs.has(logName)) {
        logger.info(`Log not found: ${logName}, namespace: ${this.namespace}`);
        return false;
      }

      // Clear the log
      this.logs.delete(logName);

      logger.info(`Cleared log: ${logName}, namespace: ${this.namespace}`);
      return true;
    } catch (error) {
      logger.error(`Error clearing log: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Purge expired logs
   *
   * @param cutoffTime Timestamp before which logs are considered expired
   * @param batchSize Maximum number of logs to purge in one batch
   * @returns Result of the purge operation
   */
  public async purgeExpiredLogs(cutoffTime: number, batchSize: number = 1000): Promise<{ purgedCount: number }> {
    await this.initialize();

    try {
      // Find expired log entries
      const expiredEntries: string[] = [];

      // Iterate through all timestamps
      for (const [key, timestamp] of this.timestamps.entries()) {
        if (timestamp <= cutoffTime) {
          expiredEntries.push(key);

          // Limit to batch size
          if (expiredEntries.length >= batchSize) {
            break;
          }
        }
      }

      if (expiredEntries.length === 0) {
        logger.info(`No expired logs found for namespace: ${this.namespace}`);
        return { purgedCount: 0 };
      }

      logger.info(`Found ${expiredEntries.length} expired logs for namespace: ${this.namespace}`);

      // Delete the expired log entries
      let deletedCount = 0;

      for (const entry of expiredEntries) {
        try {
          const [logName, logId] = entry.split(':');

          // Delete the log entry
          const deleted = await this.deleteLogEntryById(logName, logId);

          if (deleted) {
            deletedCount++;
          }
        } catch (error) {
          logger.error(`Error deleting log entry ${entry} for namespace ${this.namespace}:`, error);
        }
      }

      logger.info(`Purged ${deletedCount} expired logs for namespace: ${this.namespace}`);

      return { purgedCount: deletedCount };
    } catch (error) {
      logger.error(`Error purging expired logs for namespace ${this.namespace}:`, error);
      return { purgedCount: 0 };
    }
  }

  /**
   * Count expired logs
   *
   * @param cutoffTime Timestamp before which logs are considered expired
   * @returns Number of expired logs
   */
  public async countExpiredLogs(cutoffTime: number): Promise<number> {
    await this.initialize();

    try {
      // Count all log entries created before the cutoff time
      let count = 0;

      // Iterate through all timestamps
      for (const timestamp of this.timestamps.values()) {
        if (timestamp <= cutoffTime) {
          count++;
        }
      }

      return count;
    } catch (error) {
      logger.error(`Error counting expired logs for namespace ${this.namespace}:`, error);
      return 0;
    }
  }

  /**
   * Close the storage adapter
   * This is used to clean up resources when the adapter is no longer needed
   */
  public async close(): Promise<void> {
    // Nothing to do for memory storage
  }











  /**
   * Search logs based on various criteria
   *
   * @param options Search options
   * @returns Search results
   */
  public async searchLogs(options: {
    query?: string;
    logName?: string;
    startTime?: string;
    endTime?: string;
    fieldFilters?: Record<string, any>;
    limit?: number;
  }): Promise<Array<{logName: string; entry: any}>> {
    const {
      query,
      logName,
      startTime,
      endTime,
      fieldFilters,
      limit = 100
    } = options;

    let results: Array<{logName: string; entry: any}> = [];
    let resultCount = 0;

    // If logName is specified, search only that log, otherwise search all logs
    if (logName) {
      // Get entries for the specified log
      const entries = await this.getLogsByName(logName, 1000);

      // Apply filters
      const filteredEntries = this.filterEntries(entries, {
        query,
        fieldFilters
      });

      // Add matching entries to results
      const entriesToAdd = filteredEntries.slice(0, limit);
      results = entriesToAdd.map(entry => ({
        logName,
        entry
      }));
    } else {
      // Get all log names
      const logNames = await this.getLogNames(1000);

      // Search through each log
      for (const name of logNames) {
        if (resultCount >= limit) break;

        // Get entries for this log
        const entries = await this.getLogsByName(name, 1000);

        // Apply filters
        const filteredEntries = this.filterEntries(entries, {
          query,
          fieldFilters
        });

        if (filteredEntries.length > 0) {
          // Calculate how many entries to add
          const countToAdd = Math.min(filteredEntries.length, limit - resultCount);
          resultCount += countToAdd;

          // Add matching entries to results
          results = results.concat(
            filteredEntries.slice(0, countToAdd).map(entry => ({
              logName: name,
              entry
            }))
          );
        }
      }
    }

    logger.info(`Search returned ${results.length} results, namespace: ${this.namespace}`);
    return results;
  }

  /**
   * Filter entries based on search criteria
   *
   * @param entries Entries to filter
   * @param options Filter options
   * @returns Filtered entries
   */
  private filterEntries(entries: any[], options: {
    query?: string;
    fieldFilters?: Record<string, any>;
  }): any[] {
    const {
      query,
      fieldFilters
    } = options;

    let filteredEntries = [...entries];

    // Apply field filters
    if (fieldFilters) {
      filteredEntries = filteredEntries.filter(entry => {
        for (const [field, value] of Object.entries(fieldFilters)) {
          // Use getNestedProperty to handle nested fields with dot notation (e.g., "data.level")
          const entryValue = this.getNestedProperty(entry, field);
          if (entryValue !== value) return false;
        }
        return true;
      });
    }

    // Apply text search
    if (query) {
      const searchText = query.toLowerCase();
      filteredEntries = filteredEntries.filter(entry =>
        JSON.stringify(entry).toLowerCase().includes(searchText)
      );
    }

    return filteredEntries;
  }

  /**
   * Get a nested property from an object
   *
   * @param obj Object to get property from
   * @param path Path to property
   * @returns Property value or undefined if not found
   */
  private getNestedProperty(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Create a new log
   *
   * @param log Complete Log object
   * @returns Created log
   */
  public async createLog(log: Log): Promise<Log> {
    await this.initialize();

    // Create the log with a new ID if not provided
    const newLog: Log = {
      ...log,
      id: log.id || uuidv4(),
      createdAt: log.createdAt || new Date().toISOString(),
      updatedAt: log.updatedAt || new Date().toISOString()
    };

    // Get or create tenant logs
    const tenantId = log.tenantId;
    if (!this.tenantLogs.has(tenantId)) {
      this.tenantLogs.set(tenantId, new Map());
    }

    // Add the log to the tenant logs
    this.tenantLogs.get(tenantId)!.set(newLog.name, newLog);

    logger.info(`Created log ${newLog.name}`);
    return newLog;
  }

  /**
   * Get all logs
   *
   * @returns Array of logs
   */
  public async getLogs(): Promise<Log[]> {
    await this.initialize();

    // Get all logs from all tenants
    const allLogs: Log[] = [];

    // Iterate through all tenant logs
    for (const tenantLogs of this.tenantLogs.values()) {
      allLogs.push(...Array.from(tenantLogs.values()));
    }

    return allLogs;
  }

  /**
   * Get a log by name
   *
   * @param name Log name
   * @returns Log or null if not found
   */
  public async getLog(name: string): Promise<Log | null> {
    await this.initialize();

    // Search for the log in all tenants
    for (const tenantLogs of this.tenantLogs.values()) {
      const log = tenantLogs.get(name);
      if (log) {
        return log;
      }
    }

    return null;
  }

  /**
   * Update a log
   *
   * @param log Complete Log object
   * @returns Updated log
   */
  public async updateLog(log: Log): Promise<Log> {
    await this.initialize();

    const tenantId = log.tenantId;
    const name = log.name;

    // Get tenant logs
    const tenantLogs = this.tenantLogs.get(tenantId);
    if (!tenantLogs) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Get the existing log
    const existingLog = tenantLogs.get(name);
    if (!existingLog) {
      throw new Error(`Log ${name} not found`);
    }

    // Update the log
    const updatedLog: Log = {
      ...existingLog,
      ...log,
      updatedAt: new Date().toISOString()
    };

    // Save the updated log
    tenantLogs.set(name, updatedLog);

    logger.info(`Updated log ${name}`);
    return updatedLog;
  }

  /**
   * Delete a log
   *
   * @param name Log name
   */
  public async deleteLog(name: string): Promise<void> {
    await this.initialize();

    // Search for the log in all tenants
    for (const [tenantId, tenantLogs] of this.tenantLogs.entries()) {
      if (tenantLogs.has(name)) {
        // Delete the log
        tenantLogs.delete(name);
        logger.info(`Deleted log ${name}`);
        return;
      }
    }
  }

  /**
   * Append an entry to a log
   *
   * @param logName Log name
   * @param entry Log entry
   * @returns ID of the new entry
   */
  public async appendLogEntry(logName: string, entry: LogEntry): Promise<string> {
    await this.initialize();

    // Generate an ID if not provided
    const id = entry.id || uuidv4();

    // Create the log entry
    const logEntry: LogEntry = {
      ...entry,
      id,
      logId: logName,
      timestamp: entry.timestamp || new Date().toISOString()
    };

    // Get or create the log array
    if (!this.logs.has(logName)) {
      this.logs.set(logName, []);
    }

    // Add the entry to the log
    const logEntries = this.logs.get(logName)!;
    logEntries.push(logEntry);

    logger.info(`Appended log entry to ${logName}`);
    return id;
  }

  /**
   * Batch append entries to a log
   *
   * @param logName Log name
   * @param entries Log entries
   * @returns Result with IDs of the new entries
   */
  public async batchAppendLogEntries(logName: string, entries: LogEntry[]): Promise<BatchAppendResult> {
    await this.initialize();

    // Process each entry
    const results: { id: string; timestamp: string }[] = [];

    for (const entry of entries) {
      // Generate an ID if not provided
      const id = entry.id || uuidv4();

      // Create the log entry
      const logEntry: LogEntry = {
        ...entry,
        id,
        logId: logName,
        timestamp: entry.timestamp || new Date().toISOString()
      };

      // Get or create the log array
      if (!this.logs.has(logName)) {
        this.logs.set(logName, []);
      }

      // Add the entry to the log
      const logEntries = this.logs.get(logName)!;
      logEntries.push(logEntry);

      // Add to results
      results.push({
        id,
        timestamp: logEntry.timestamp || ''
      });
    }

    logger.info(`Batch appended ${entries.length} log entries to ${logName}`);
    return { entries: results };
  }

  /**
   * Get log entries
   *
   * @param logName Log name
   * @param options Options for pagination
   * @returns Paginated result of log entries
   */
  public async getLogEntries(logName: string, options: { limit?: number; offset?: number }): Promise<PaginatedResult<LogEntry>> {
    await this.initialize();

    // Get the log entries
    const allEntries = this.logs.get(logName) || [];

    // We don't sort by timestamp in a zero-knowledge system
    // as timestamps are encrypted on the client side
    const sortedEntries = [...allEntries];

    // Apply pagination
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    const paginatedEntries = sortedEntries.slice(offset, offset + limit);

    // Create the paginated result
    const result: PaginatedResult<LogEntry> = {
      items: paginatedEntries,
      total: allEntries.length,
      entries: paginatedEntries,
      totalCount: allEntries.length,
      limit,
      offset,
      hasMore: offset + limit < allEntries.length
    };

    logger.info(`Retrieved ${paginatedEntries.length} entries for log ${logName}`);
    return result;
  }

  /**
   * Get a log entry
   *
   * @param logName Log name
   * @param entryId Entry ID
   * @returns Log entry or null if not found
   */
  public async getLogEntry(logName: string, entryId: string): Promise<LogEntry | null> {
    await this.initialize();

    // Get the log entries
    const logEntries = this.logs.get(logName) || [];

    // Find the entry with the specified ID
    const entry = logEntries.find(entry => entry.id === entryId);

    if (entry) {
      logger.info(`Retrieved log entry ${entryId} for log ${logName}`);
      return entry;
    } else {
      logger.info(`Log entry ${entryId} not found for log ${logName}`);
      return null;
    }
  }

  /**
   * Search log entries
   *
   * @param logName Log name
   * @param options Search options
   * @returns Paginated result of log entries
   */
  public async searchLogEntries(logName: string, options: LogSearchOptions): Promise<PaginatedResult<LogEntry>> {
    await this.initialize();

    // Get the log entries
    const allEntries = this.logs.get(logName) || [];

    // Apply filters
    let filteredEntries = [...allEntries];

    // Apply query filter
    if (options.query) {
      const query = options.query.toLowerCase();
      filteredEntries = filteredEntries.filter(entry =>
        JSON.stringify(entry).toLowerCase().includes(query)
      );
    }

    // We don't sort by timestamp in a zero-knowledge system
    // as timestamps are encrypted on the client side
    const sortedEntries = filteredEntries;

    // Apply pagination
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    const paginatedEntries = sortedEntries.slice(offset, offset + limit);

    // Create the paginated result
    const result: PaginatedResult<LogEntry> = {
      items: paginatedEntries,
      total: filteredEntries.length,
      entries: paginatedEntries,
      totalCount: filteredEntries.length,
      limit,
      offset,
      hasMore: offset + limit < filteredEntries.length
    };

    logger.info(`Search returned ${paginatedEntries.length} results for log ${logName}`);
    return result;
  }


}
