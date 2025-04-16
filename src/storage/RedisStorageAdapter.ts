import { StorageAdapter } from './StorageAdapter';
import Redis from 'ioredis';
import logger from '../utils/logger';
import { Log, LogEntry, LogSearchOptions, PaginatedResult, BatchAppendResult } from '@neurallog/client-sdk/dist/types/api';
import { LogMetadataService } from '../services/LogMetadataService';

// Server namespace prefix for all keys
const SERVER_NAMESPACE = 'logserver';

/**
 * Redis connection options
 */
export interface RedisOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  url?: string;
  tls?: boolean;
  keyPrefix?: string;
}

/**
 * Redis storage adapter for storing log entries
 */
export class RedisStorageAdapter implements StorageAdapter {
  private client: Redis;
  private initialized: boolean = false;
  private namespace: string;

  // No in-memory statistics storage - everything is stored in Redis

  /**
   * Constructor
   *
   * @param namespace Namespace for this storage adapter
   * @param options Redis connection options
   */
  constructor(namespace: string = 'default', options: RedisOptions = {}) {
    this.namespace = namespace;
    // Create Redis client
    if (options.url) {
      this.client = new Redis(options.url, {
        keyPrefix: options.keyPrefix,
        tls: options.tls ? {} : undefined
      });
    } else {
      this.client = new Redis({
        host: options.host || 'localhost',
        port: options.port || 6379,
        password: options.password,
        db: options.db || 0,
        keyPrefix: options.keyPrefix,
        tls: options.tls ? {} : undefined
      });
    }

    // Handle Redis errors
    this.client.on('error', (error) => {
      logger.error(`Redis error: ${error instanceof Error ? error.message : String(error)}`);
    });
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
   * Initialize the adapter
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Test connection
      await this.client.ping();

      this.initialized = true;
      logger.info(`Redis storage adapter initialized for ${SERVER_NAMESPACE}:${this.namespace}`);
    } catch (error) {
      logger.error(`Error initializing RedisStorageAdapter: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Store a log entry
   *
   * @param logId Log ID
   * @param logName Log name (already encrypted by the client)
   * @param encryptedData The encrypted log data from the client
   * @param searchTokens Optional search tokens for searchable encryption
   */
  public async storeLogEntry(
    logId: string,
    logName: string,
    encryptedData: any,
    searchTokens?: string[]
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      // Create a document with the log entry
      const document: LogEntry = {
        id: logId,
        logId: logName,
        data: encryptedData,
        timestamp: new Date().toISOString()
      };

      // Store the log entry
      const logKey = this.getLogKey(logName, logId);
      await this.client.set(logKey, JSON.stringify(document));

      // Add to the log name set
      const logNamesKey = this.getLogNamesKey();
      await this.client.sadd(logNamesKey, logName);

      // Add to the log entries set
      const logEntriesKey = this.getLogEntriesKey(logName);
      await this.client.sadd(logEntriesKey, logId);

      // Store the creation timestamp in a sorted set for data retention
      const timestampsKey = this.getTimestampsKey();
      await this.client.zadd(timestampsKey, Date.now(), `${logName}:${logId}`);

      // If search tokens are provided, index them
      if (searchTokens && searchTokens.length > 0) {
        await this.indexSearchTokens(logName, logId, searchTokens);
      }

      // Log the operation
      logger.debug(`Added log entry ${logId} to ${logName}`);

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
  public async getLogEntryById(logName: string, logId: string): Promise<any | null> {
    await this.ensureInitialized();

    try {
      // Get the log entry
      const logKey = this.getLogKey(logName, logId);
      const entry = await this.client.get(logKey);

      if (entry) {
        logger.info(`Retrieved log entry: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
        return JSON.parse(entry);
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
   * @param logEntry Log entry
   * @returns True if the log entry was updated, false if it didn't exist
   */
  public async updateLogEntryById(logName: string, logId: string, logEntry: any): Promise<boolean> {
    await this.ensureInitialized();

    try {
      // Check if the log entry exists
      const logKey = this.getLogKey(logName, logId);
      const existingEntry = await this.client.get(logKey);

      if (!existingEntry) {
        logger.info(`Log entry not found for update: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
        return false;
      }

      // Parse the existing entry
      const existing = JSON.parse(existingEntry);

      // Create updated document
      const document = {
        ...existing,
        data: logEntry,
        timestamp: new Date().toISOString()
      };

      // Update the log entry
      await this.client.set(logKey, JSON.stringify(document));

      // Ensure the log ID is in the entries set
      const logEntriesKey = this.getLogEntriesKey(logName);
      await this.client.sadd(logEntriesKey, logId);

      // Log the operation
      logger.debug(`Updated log entry ${logId} in ${logName}`);

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
    await this.ensureInitialized();

    try {
      // Get the log entry before deleting it
      const logKey = this.getLogKey(logName, logId);
      const entryJson = await this.client.get(logKey);

      if (!entryJson) {
        logger.info(`Log entry not found for deletion: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
        return false;
      }

      // Parse the entry
      const entry = JSON.parse(entryJson);

      // Delete the log entry
      await this.client.del(logKey);

      // Remove from the entries set
      const logEntriesKey = this.getLogEntriesKey(logName);
      await this.client.srem(logEntriesKey, logId);

      // Remove from the timestamps sorted set
      const timestampsKey = this.getTimestampsKey();
      await this.client.zrem(timestampsKey, `${logName}:${logId}`);

      // Log the operation
      logger.debug(`Deleted log entry ${logId} from ${logName}`);

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
    await this.ensureInitialized();

    try {
      // Get log IDs from the entries set
      const logEntriesKey = this.getLogEntriesKey(logName);
      const logIds = await this.client.smembers(logEntriesKey);
      // Limit the number of entries
      const limitedLogIds = logIds.slice(0, limit);

      if (logIds.length === 0) {
        logger.info(`No logs found for: ${logName}, namespace: ${this.namespace}`);
        return [];
      }

      // Get log entries
      const pipeline = this.client.pipeline();
      for (const logId of limitedLogIds) {
        const logKey = this.getLogKey(logName, logId);
        pipeline.get(logKey);
      }

      const results = await pipeline.exec();
      const entries = results ? results
        .filter(result => result && result[1])
        .map(result => JSON.parse(result[1] as string)) : [];

      logger.info(`Retrieved ${entries.length} entries for log: ${logName}, namespace: ${this.namespace}`);
      return entries;
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
    await this.ensureInitialized();

    try {
      // Get log names from the set
      const logNamesKey = this.getLogNamesKey();
      const logNames = await this.client.smembers(logNamesKey);

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
    await this.ensureInitialized();

    try {
      // Get log IDs from the entries set
      const logEntriesKey = this.getLogEntriesKey(logName);
      const logIds = await this.client.smembers(logEntriesKey);

      if (logIds.length === 0) {
        logger.info(`Log not found: ${logName}, namespace: ${this.namespace}`);
        return false;
      }

      // Delete all log entries
      const pipeline = this.client.pipeline();
      for (const logId of logIds) {
        const logKey = this.getLogKey(logName, logId);
        pipeline.del(logKey);
      }

      // Clear the sorted set
      pipeline.del(logEntriesKey);

      // Remove from the log names set
      const logNamesKey = this.getLogNamesKey();
      pipeline.srem(logNamesKey, logName);

      await pipeline.exec();

      // Log the operation
      logger.debug(`Cleared log ${logName}`);

      logger.info(`Cleared log: ${logName}, removed ${logIds.length} entries, namespace: ${this.namespace}`);
      return true;
    } catch (error) {
      logger.error(`Error clearing log: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
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
    await this.ensureInitialized();
    const {
      query,
      logName,
      startTime,
      endTime,
      fieldFilters,
      limit = 100
    } = options;

    let results: Array<{logName: string; entry: any}> = [];

    try {
      // If logName is specified, search only that log, otherwise search all logs
      if (logName) {
        // Get entries for the specified log with time filter
        const entries = await this.getLogEntriesWithTimeFilter(logName, startTime, endTime, limit);

        // Apply filters
        const filteredEntries = this.filterEntries(entries, {
          query,
          fieldFilters
        });

        // Add matching entries to results
        results = filteredEntries.map(entry => ({
          logName,
          entry
        }));
      } else {
        // Get all log names
        const logNames = await this.getLogNames(1000);
        let resultCount = 0;

        // Search through each log
        for (const name of logNames) {
          if (resultCount >= limit) break;

          // Get entries for this log with time filter
          const entries = await this.getLogEntriesWithTimeFilter(name, startTime, endTime, limit);

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
    } catch (error) {
      logger.error(`Error searching logs: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get log entries
   *
   * @param logName Log name
   * @param limit Maximum number of entries to return
   * @returns Log entries
   */
  private async getLogEntriesWithTimeFilter(
    logName: string,
    _startTime?: string, // Unused in zero-knowledge system
    _endTime?: string,   // Unused in zero-knowledge system
    limit: number = 100
  ): Promise<any[]> {
    // In a zero-knowledge system, we don't filter by time on the server
    // as timestamps are encrypted on the client side

    // Get log IDs from the entries set
    const logEntriesKey = this.getLogEntriesKey(logName);
    const logIds = await this.client.smembers(logEntriesKey);

    // Limit the number of entries
    const limitedLogIds = logIds.slice(0, limit);

    if (limitedLogIds.length === 0) {
      return [];
    }

    // Get log entries
    const pipeline = this.client.pipeline();
    for (const logId of limitedLogIds) {
      const logKey = this.getLogKey(logName, logId);
      pipeline.get(logKey);
    }

    const results = await pipeline.exec();
    return results ? results
      .filter(result => result && result[1])
      .map(result => JSON.parse(result[1] as string)) : [];
  }

  /**
   * Index search tokens for a log entry
   *
   * @param logName Log name
   * @param logId Log ID
   * @param searchTokens Search tokens
   */
  private async indexSearchTokens(logName: string, logId: string, searchTokens: string[]): Promise<void> {
    try {
      // For each token, add the log ID to the set of logs containing that token
      const pipeline = this.client.pipeline();

      for (const token of searchTokens) {
        const tokenKey = this.getSearchTokenKey(token);
        pipeline.sadd(tokenKey, `${logName}:${logId}`);
      }

      // Store the tokens for this log entry
      const logTokensKey = this.getLogTokensKey(logName, logId);
      pipeline.sadd(logTokensKey, ...searchTokens);

      await pipeline.exec();

      logger.info(`Indexed ${searchTokens.length} search tokens for log: ${logName}, ID: ${logId}, namespace: ${this.namespace}`);
    } catch (error) {
      logger.error(`Error indexing search tokens: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search logs by token
   *
   * @param token Search token
   * @param limit Maximum number of results to return
   * @returns Search results
   */
  public async searchLogsByToken(token: string, limit: number = 100): Promise<Array<{logName: string; entry: any}>> {
    await this.ensureInitialized();

    try {
      // Get log entries containing this token
      const tokenKey = this.getSearchTokenKey(token);
      const logEntries = await this.client.smembers(tokenKey);

      if (logEntries.length === 0) {
        logger.info(`No logs found for token: ${token}, namespace: ${this.namespace}`);
        return [];
      }

      // Limit the number of entries
      const limitedEntries = logEntries.slice(0, limit);

      // Get log entries
      const results: Array<{logName: string; entry: any}> = [];

      for (const logEntry of limitedEntries) {
        const [logName, logId] = logEntry.split(':');
        const entry = await this.getLogEntryById(logName, logId);

        if (entry) {
          results.push({
            logName,
            entry
          });
        }
      }

      logger.info(`Search by token returned ${results.length} results, namespace: ${this.namespace}`);
      return results;
    } catch (error) {
      logger.error(`Error searching logs by token: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get search token key
   *
   * @param token Search token
   * @returns Search token key
   */
  private getSearchTokenKey(token: string): string {
    return `${SERVER_NAMESPACE}:${this.namespace}:token:${token}`;
  }

  /**
   * Get log tokens key
   *
   * @param logName Log name
   * @param logId Log ID
   * @returns Log tokens key
   */
  private getLogTokensKey(logName: string, logId: string): string {
    return `${SERVER_NAMESPACE}:${this.namespace}:log:${logName}:${logId}:tokens`;
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
          // Handle nested fields with dot notation (e.g., "data.level")
          const fieldParts = field.split('.');
          let entryValue = entry;

          for (const part of fieldParts) {
            if (entryValue === undefined || entryValue === null) return false;
            entryValue = entryValue[part];
          }

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
   * Ensure the adapter is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get a generic key with namespace
   *
   * @param key Key
   * @returns Redis key
   */
  private getKey(key: string): string {
    return `${SERVER_NAMESPACE}:${this.namespace}:${key}`;
  }

  /**
   * Get the key for a log entry
   *
   * @param logName Log name
   * @param logId Log ID
   * @returns Redis key
   */
  private getLogKey(logName: string, logId: string): string {
    return this.getKey(`logs:${logName}:${logId}`);
  }

  /**
   * Get the key for log names set
   *
   * @returns Redis key
   */
  private getLogNamesKey(): string {
    return this.getKey('lognames');
  }

  /**
   * Get the key for log entries sorted set
   *
   * @param logName Log name
   * @returns Redis key
   */
  private getLogEntriesKey(logName: string): string {
    return this.getKey(`logs:${logName}:entries`);
  }

  /**
   * Get the key for the timestamps sorted set
   *
   * @returns Redis key for the timestamps sorted set
   */
  private getTimestampsKey(): string {
    return this.getKey(`timestamps`);
  }





  /**
   * Create a new log
   *
   * @param log Complete Log object
   * @returns Created log
   */
  public async createLog(log: Log): Promise<Log> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Create the log
      const newLog: Log = {
        ...log,
        id: log.id || Math.random().toString(36).substring(2, 15),
        createdAt: log.createdAt || new Date().toISOString(),
        updatedAt: log.updatedAt || new Date().toISOString()
      };

      // Store the log in Redis with tenant ID for storage
      const logKey = this.getKey(`tenant:${tenantId}:log:${newLog.name}`);
      await this.client.set(logKey, JSON.stringify({
        ...newLog,
        tenantId
      }));

      // Add to tenant logs set
      const tenantLogsKey = this.getKey(`tenant:${tenantId}:logs`);
      await this.client.sadd(tenantLogsKey, newLog.name);

      logger.info(`Created log ${newLog.name}`);
      return newLog;
    } catch (error) {
      logger.error(`Error creating log: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }


  }

  /**
   * Get all logs
   *
   * @returns Array of logs
   */
  public async getLogs(): Promise<Log[]> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Get all log names for the tenant
      const tenantLogsKey = this.getKey(`tenant:${tenantId}:logs`);
      const logNames = await this.client.smembers(tenantLogsKey);

      // Get each log
      const logsWithTenant: (Log & { tenantId: string })[] = [];
      for (const logName of logNames) {
        const logKey = this.getKey(`tenant:${tenantId}:log:${logName}`);
        const logJson = await this.client.get(logKey);
        if (logJson) {
          logsWithTenant.push(JSON.parse(logJson));
        }
      }

      // Remove tenant ID from the returned logs
      const logs = logsWithTenant.map(({ tenantId: _, ...rest }) => rest as Log);

      logger.info(`Retrieved ${logs.length} logs`);
      return logs;
    } catch (error) {
      logger.error(`Error getting logs: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }


  }

  /**
   * Get a log by name
   *
   * @param name Log name
   * @returns Log or null if not found
   */
  public async getLog(name: string): Promise<Log | null> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Get the log
      const logKey = this.getKey(`tenant:${tenantId}:log:${name}`);
      const logJson = await this.client.get(logKey);

      if (logJson) {
        const logWithTenant = JSON.parse(logJson);
        // Remove tenant ID from the returned log
        const { tenantId: _, ...log } = logWithTenant;
        logger.info(`Retrieved log ${name}`);
        return log as Log;
      } else {
        logger.info(`Log ${name} not found`);
        return null;
      }
    } catch (error) {
      logger.error(`Error getting log: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }


  }

  /**
   * Update a log
   *
   * @param log Complete Log object
   * @returns Updated log
   */
  public async updateLog(log: Log): Promise<Log> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';
      const name = log.name;

      // Get the log
      const logKey = this.getKey(`tenant:${tenantId}:log:${name}`);
      const logJson = await this.client.get(logKey);

      if (!logJson) {
        throw new Error(`Log ${name} not found`);
      }

      // Parse the log
      const existingLogWithTenant = JSON.parse(logJson);
      // Remove tenant ID from the existing log
      const { tenantId: _, ...existingLog } = existingLogWithTenant;

      // Update the log
      const updatedLog: Log = {
        ...existingLog,
        ...log,
        updatedAt: new Date().toISOString()
      };

      // Store the updated log
      await this.client.set(logKey, JSON.stringify({
        ...updatedLog,
        tenantId // Keep tenant ID for storage
      }));

      logger.info(`Updated log ${name}`);
      return updatedLog;
    } catch (error) {
      logger.error(`Error updating log: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }


  }

  /**
   * Delete a log
   *
   * @param name Log name
   */
  public async deleteLog(name: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Get all log entry IDs
      const logEntriesKey = this.getLogEntriesKey(name);
      const logIds = await this.client.zrange(logEntriesKey, 0, -1);

      // Delete all log entries
      const pipeline = this.client.pipeline();

      // Delete each log entry
      for (const logId of logIds) {
        const logKey = this.getLogKey(name, logId);
        pipeline.del(logKey);
      }

      // Delete the log entries sorted set
      pipeline.del(logEntriesKey);

      // Delete the log
      const logKey = this.getKey(`tenant:${tenantId}:log:${name}`);
      pipeline.del(logKey);

      // Remove from tenant logs set
      const tenantLogsKey = this.getKey(`tenant:${tenantId}:logs`);
      pipeline.srem(tenantLogsKey, name);

      await pipeline.exec();

      logger.info(`Deleted log ${name}`);
    } catch (error) {
      logger.error(`Error deleting log: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
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
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Check if the log exists
      const logKey = this.getKey(`tenant:${tenantId}:log:${logName}`);
      const logJson = await this.client.get(logKey);

      if (!logJson) {
        throw new Error(`Log ${logName} not found`);
      }

      // Generate an ID if not provided
      const id = entry.id || Math.random().toString(36).substring(2, 15);

      // Create the log entry
      const logEntry: LogEntry = {
        ...entry,
        id,
        logId: logName,
        timestamp: entry.timestamp || new Date().toISOString()
      };

      // Store the log entry
      const entryKey = this.getLogKey(logName, id);
      await this.client.set(entryKey, JSON.stringify(logEntry));

      // Add to the entries set
      const logEntriesKey = this.getLogEntriesKey(logName);
      await this.client.sadd(logEntriesKey, id);

      logger.info(`Appended log entry to ${logName}`);
      return id;
    } catch (error) {
      logger.error(`Error appending log entry: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }


  }



  /**
   * Get log entries
   *
   * @param logName Log name
   * @param options Options for pagination
   * @returns Paginated result of log entries
   */
  public async getLogEntries(logName: string, options: { limit?: number; offset?: number }): Promise<PaginatedResult<LogEntry>> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Check if the log exists
      const logKey = this.getKey(`tenant:${tenantId}:log:${logName}`);
      const logJson = await this.client.get(logKey);

      if (!logJson) {
        throw new Error(`Log ${logName} not found`);
      }

      // Get the total count
      const logEntriesKey = this.getLogEntriesKey(logName);
      const totalCount = await this.client.zcard(logEntriesKey);

      // Apply pagination
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      // Get the paginated entries (newest first)
      const logIds = await this.client.zrevrange(logEntriesKey, offset, offset + limit - 1);

      // Get each log entry
      const entries: LogEntry[] = [];
      for (const logId of logIds) {
        const logKey = this.getLogKey(logName, logId);
        const logJson = await this.client.get(logKey);
        if (logJson) {
          entries.push(JSON.parse(logJson));
        }
      }

      // Create the paginated result
      const result: PaginatedResult<LogEntry> = {
        items: entries,
        total: totalCount,
        entries,
        totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      };

      logger.info(`Retrieved ${entries.length} entries for log ${logName} for tenant ${tenantId}`);
      return result;
    } catch (error) {
      logger.error(`Error getting log entries: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Batch append entries to a log
   *
   * @param logName Log name
   * @param entries Log entries
   * @returns Result with IDs of the new entries
   */
  public async batchAppendLogEntries(logName: string, entries: LogEntry[]): Promise<BatchAppendResult> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Check if the log exists
      const logKey = this.getKey(`tenant:${tenantId}:log:${logName}`);
      const logJson = await this.client.get(logKey);

      if (!logJson) {
        throw new Error(`Log ${logName} not found`);
      }

      // Process each entry
      const results: { id: string; timestamp: string }[] = [];
      const pipeline = this.client.pipeline();

      for (const entry of entries) {
        // Generate an ID if not provided
        const id = entry.id || Math.random().toString(36).substring(2, 15);

        // Create the log entry
        const logEntry: LogEntry = {
          ...entry,
          id,
          logId: logName,
          timestamp: entry.timestamp || new Date().toISOString()
        };

        // Store the log entry
        const logKey = this.getLogKey(logName, id);
        pipeline.set(logKey, JSON.stringify(logEntry));

        // Add to the entries set
        const logEntriesKey = this.getLogEntriesKey(logName);
        pipeline.sadd(logEntriesKey, id);

        // Add to results
        results.push({
          id,
          timestamp: logEntry.timestamp || ''
        });
      }

      await pipeline.exec();

      logger.info(`Batch appended ${entries.length} log entries to ${logName} for tenant ${tenantId}`);
      return { entries: results };
    } catch (error) {
      logger.error(`Error batch appending log entries: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
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
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Check if the log exists
      const logKey = this.getKey(`tenant:${tenantId}:log:${logName}`);
      const logJson = await this.client.get(logKey);

      if (!logJson) {
        throw new Error(`Log ${logName} not found`);
      }

      // Get all log entry IDs
      const logEntriesKey = this.getLogEntriesKey(logName);
      let logIds: string[] = [];

      // Apply time filters if provided
      if (options.startTime || options.endTime) {
        const startTime = options.startTime ? new Date(options.startTime).getTime() : '-inf';
        const endTime = options.endTime ? new Date(options.endTime).getTime() : '+inf';
        logIds = await this.client.zrangebyscore(logEntriesKey, startTime, endTime);
      } else {
        logIds = await this.client.zrange(logEntriesKey, 0, -1);
      }

      // Get each log entry
      const allEntries: LogEntry[] = [];
      for (const logId of logIds) {
        const logKey = this.getLogKey(logName, logId);
        const logJson = await this.client.get(logKey);
        if (logJson) {
          allEntries.push(JSON.parse(logJson));
        }
      }

      // Apply query filter
      let filteredEntries = [...allEntries];
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

      logger.info(`Search returned ${paginatedEntries.length} results for log ${logName} for tenant ${tenantId}`);
      return result;
    } catch (error) {
      logger.error(`Error searching log entries: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get a log entry
   *
   * @param logName Log name
   * @param entryId Entry ID
   * @returns Log entry or null if not found
   */
  public async getLogEntry(logName: string, entryId: string): Promise<LogEntry | null> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Check if the log exists
      const logKey = this.getKey(`tenant:${tenantId}:log:${logName}`);
      const logJson = await this.client.get(logKey);

      if (!logJson) {
        throw new Error(`Log ${logName} not found`);
      }

      // Get the log entry
      const entryKey = this.getLogKey(logName, entryId);
      const entryJson = await this.client.get(entryKey);

      if (entryJson) {
        const entry = JSON.parse(entryJson);
        logger.info(`Retrieved log entry ${entryId} for log ${logName}`);
        return entry;
      } else {
        logger.info(`Log entry ${entryId} not found for log ${logName}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error getting log entry: ${error instanceof Error ? error.message : String(error)}`);
      return null;
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
    await this.ensureInitialized();

    try {
      // Find expired log entries
      const timestampsKey = this.getTimestampsKey();
      const expiredEntries = await this.client.zrangebyscore(
        timestampsKey,
        0,  // Min score (beginning of time)
        cutoffTime,  // Max score (cutoff time)
        'LIMIT', 0, batchSize  // Pagination
      );

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
          const logKey = this.getLogKey(logName, logId);
          await this.client.del(logKey);

          // Remove from the entries set
          const logEntriesKey = this.getLogEntriesKey(logName);
          await this.client.srem(logEntriesKey, logId);

          // Remove from the timestamps sorted set
          await this.client.zrem(timestampsKey, entry);

          deletedCount++;
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
    await this.ensureInitialized();

    try {
      // Count all log entries created before the cutoff time
      const timestampsKey = this.getTimestampsKey();
      return await this.client.zcount(
        timestampsKey,
        0,  // Min score (beginning of time)
        cutoffTime  // Max score (cutoff time)
      );
    } catch (error) {
      logger.error(`Error counting expired logs for namespace ${this.namespace}:`, error);
      return 0;
    }
  }

  /**
   * Close the adapter
   * This is used to clean up resources when the adapter is no longer needed
   */
  public async close(): Promise<void> {
    this.client.disconnect();
    this.initialized = false;
    logger.info(`Redis storage adapter closed for ${SERVER_NAMESPACE}:${this.namespace}`);
  }
}
