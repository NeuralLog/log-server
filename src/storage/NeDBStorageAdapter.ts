import { StorageAdapter } from './StorageAdapter';
import Datastore from 'nedb';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { Log, LogEntry, LogSearchOptions, PaginatedResult, BatchAppendResult } from '@neurallog/client-sdk/dist/types/api';

// Server namespace prefix for all data
const SERVER_NAMESPACE = 'logserver';

/**
 * NeDB storage adapter for storing log entries
 */
export class NeDBStorageAdapter implements StorageAdapter {
  private _logsDb: Datastore;
  private _logsMetaDb: Datastore;
  private initialized: boolean = false;

  private namespace: string;

  // Tenant logs storage
  private tenantLogs: Map<string, Map<string, Log>> = new Map();

  /**
   * Constructor
   *
   * @param namespace Namespace for this storage adapter
   * @param dbPath Path to the database directory (default: './data')
   */
  constructor(namespace: string = 'default', private readonly dbPath: string = './data') {
    this.namespace = namespace;

    // Create the database directory if it doesn't exist
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    // Create the server namespace directory
    const serverNamespacePath = path.join(dbPath, SERVER_NAMESPACE);
    if (!fs.existsSync(serverNamespacePath)) {
      fs.mkdirSync(serverNamespacePath, { recursive: true });
    }

    // Create the namespace directory
    const namespacePath = path.join(serverNamespacePath, namespace);
    if (!fs.existsSync(namespacePath)) {
      fs.mkdirSync(namespacePath, { recursive: true });
    }

    // Create the logs database
    this._logsDb = new Datastore({
      filename: path.join(namespacePath, 'logs.db'),
      autoload: false
    });

    // Create the logs metadata database
    this._logsMetaDb = new Datastore({
      filename: path.join(namespacePath, 'logs-meta.db'),
      autoload: false
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
   * Get the results database name
   */
  public get resultsDb(): string {
    return 'logs';
  }

  /**
   * Initialize the adapter
   * This loads the database and creates indexes
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load the databases
      await this.loadDatabase(this._logsDb);
      await this.loadDatabase(this._logsMetaDb);

      // Create indexes for logs database
      await this.createIndex(this._logsDb, 'id', { unique: true });
      await this.createIndex(this._logsDb, 'name', { unique: false });

      // Create indexes for logs metadata database
      await this.createIndex(this._logsMetaDb, 'id', { unique: true });
      await this.createIndex(this._logsMetaDb, 'tenantId', { unique: false });
      await this.createIndex(this._logsMetaDb, 'name', { unique: false });

      this.initialized = true;
      logger.info(`NeDB storage adapter initialized for ${SERVER_NAMESPACE}:${this.namespace}`);
    } catch (error) {
      logger.error(`Error initializing NeDBStorageAdapter: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create a new log
   *
   * @param log Complete Log object
   * @returns Created log
   */
  public async createLog(logData: Log): Promise<Log> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';

      // Create the log
      const log: Log = {
        ...logData,
        id: logData.id || Math.random().toString(36).substring(2, 15),
        createdAt: logData.createdAt || new Date().toISOString(),
        updatedAt: logData.updatedAt || new Date().toISOString()
      };

      // Insert the log into the database with tenant ID for storage
      await this.insert(this._logsMetaDb, {
        ...log,
        tenantId
      });

      // Get or create tenant logs
      if (!this.tenantLogs.has(tenantId)) {
        this.tenantLogs.set(tenantId, new Map());
      }

      // Add the log to the tenant logs
      this.tenantLogs.get(tenantId)!.set(log.name, log);

      logger.info(`Created log ${log.name}`);
      return log;
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

      // Find all logs for the tenant
      const logs = await this.find<Log & { tenantId: string }>(this._logsMetaDb, { tenantId });

      // Update the tenant logs cache
      if (!this.tenantLogs.has(tenantId)) {
        this.tenantLogs.set(tenantId, new Map());
      }

      const tenantLogsMap = this.tenantLogs.get(tenantId)!;

      // Remove tenant ID from the returned logs but keep it for internal use
      const cleanedLogs = logs.map(log => {
        const { tenantId: _, ...rest } = log;
        return rest as Log;
      });

      // Update cache
      for (const log of cleanedLogs) {
        tenantLogsMap.set(log.name, log);
      }

      logger.info(`Retrieved ${cleanedLogs.length} logs`);
      return cleanedLogs;
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

      // Find the log
      const log = await this.findOne<Log & { tenantId: string }>(this._logsMetaDb, { tenantId, name });

      if (log) {
        // Update the tenant logs cache
        if (!this.tenantLogs.has(tenantId)) {
          this.tenantLogs.set(tenantId, new Map());
        }

        // Remove tenant ID from the returned log but keep it for internal use
        const { tenantId: _, ...cleanedLog } = log;
        const typedLog = cleanedLog as Log;

        this.tenantLogs.get(tenantId)!.set(name, typedLog);

        logger.info(`Retrieved log ${name}`);
        return typedLog;
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
  public async updateLog(logData: Log): Promise<Log> {
    await this.ensureInitialized();

    try {
      // Get tenant ID from environment variable
      const tenantId = process.env.TENANT_ID || 'default-tenant';
      const name = logData.name;

      // Find the log
      const existingLog = await this.findOne<Log & { tenantId: string }>(this._logsMetaDb, { tenantId, name });

      if (!existingLog) {
        throw new Error(`Log ${name} not found`);
      }

      // Remove tenant ID from the existing log
      const { tenantId: _, ...cleanedExistingLog } = existingLog;

      // Update the log
      const updatedLog: Log = {
        ...cleanedExistingLog,
        ...logData,
        updatedAt: new Date().toISOString()
      };

      // Update the log in the database
      await this.update(
        this._logsMetaDb,
        { tenantId, name },
        { $set: {
          ...updatedLog,
          tenantId // Keep tenant ID for storage
        }}
      );

      // Update the tenant logs cache
      if (!this.tenantLogs.has(tenantId)) {
        this.tenantLogs.set(tenantId, new Map());
      }

      this.tenantLogs.get(tenantId)!.set(name, updatedLog);

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

      // Delete the log from the database
      await this.remove(this._logsMetaDb, { tenantId, name });

      // Delete all log entries
      await this.remove(this._logsDb, { name });

      // Update the tenant logs cache
      if (this.tenantLogs.has(tenantId)) {
        this.tenantLogs.get(tenantId)!.delete(name);
      }

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
      const log = await this.findOne<Log>(this._logsMetaDb, { tenantId, name: logName });
      if (!log) {
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

      // Insert the log entry
      await this.insert(this._logsDb, logEntry);

      logger.info(`Appended log entry to ${logName}`);
      return id;
    } catch (error) {
      logger.error(`Error appending log entry: ${error instanceof Error ? error.message : String(error)}`);
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
      const log = await this.findOne<Log>(this._logsMetaDb, { tenantId, name: logName });
      if (!log) {
        throw new Error(`Log ${logName} not found`);
      }

      // Process each entry
      const results: { id: string; timestamp: string }[] = [];

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

        // Insert the log entry
        await this.insert(this._logsDb, {
          ...logEntry,
          name: logName,
          tenantId
        });

        // Add to results
        results.push({
          id,
          timestamp: logEntry.timestamp || ''
        });
      }

      logger.info(`Batch appended ${entries.length} log entries to ${logName}`);
      return { entries: results };
    } catch (error) {
      logger.error(`Error batch appending log entries: ${error instanceof Error ? error.message : String(error)}`);
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
      // Get the total count
      const allEntries = await this.find<LogEntry>(this._logsDb, { name: logName });

      // Apply pagination
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      // Get the paginated entries
      const paginatedEntries = await this.find<LogEntry>(
        this._logsDb,
        { name: logName },
        { timestamp: -1 }
      );

      // Apply pagination manually
      const paginatedResults = paginatedEntries.slice(offset, offset + limit);

      // Create the paginated result
      const result: PaginatedResult<LogEntry> = {
        items: paginatedResults,
        total: allEntries.length,
        entries: paginatedResults,
        totalCount: allEntries.length,
        limit,
        offset,
        hasMore: offset + limit < allEntries.length
      };

      logger.info(`Retrieved ${paginatedResults.length} entries for log ${logName}`);
      return result;
    } catch (error) {
      logger.error(`Error getting log entries: ${error instanceof Error ? error.message : String(error)}`);
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
      const log = await this.findOne<Log>(this._logsMetaDb, { tenantId, name: logName });
      if (!log) {
        throw new Error(`Log ${logName} not found`);
      }

      // Find the log entry
      const entry = await this.findOne<LogEntry>(this._logsDb, { name: logName, id: entryId });

      if (entry) {
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
   * Search log entries
   *
   * @param logName Log name
   * @param options Search options
   * @returns Paginated result of log entries
   */
  public async searchLogEntries(logName: string, options: LogSearchOptions): Promise<PaginatedResult<LogEntry>> {
    await this.ensureInitialized();

    try {
      // Get all entries for the log
      const allEntries = await this.find<LogEntry>(this._logsDb, { name: logName });

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
    } catch (error) {
      logger.error(`Error searching log entries: ${error instanceof Error ? error.message : String(error)}`);
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
  public async storeLogEntry(logId: string, logName: string, encryptedData: any, searchTokens?: string[]): Promise<void> {
    await this.ensureInitialized();

    try {
      // Create a document with the log entry
      const document: LogEntry = {
        id: logId,
        logId: logName,
        data: encryptedData,
        timestamp: new Date().toISOString(),
        createdAt: Date.now() // Store creation timestamp for data retention
      };

      // Insert the document
      await this.insert(this._logsDb, document);

      // Log the operation
      logger.debug(`Added log entry ${logId} to ${logName}`);

      logger.info(`Stored log entry: ${logName}, ID: ${logId}`);
    } catch (error) {
      logger.error(`Error storing log entry: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Try to parse a JSON string, return the original string if parsing fails
   *
   * @param jsonString String to parse
   * @returns Parsed object or original string
   */
  private tryParseJSON(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return jsonString;
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
      // Find the log entry
      const entry = await this.findOne<LogEntry>(this._logsDb, { id: logId });

      if (entry) {
        logger.info(`Retrieved log entry: ${logName}, ID: ${logId}`);
        return entry;
      } else {
        logger.info(`Log entry not found: ${logName}, ID: ${logId}`);
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
    await this.ensureInitialized();

    try {
      // Check if the log entry exists
      const existingEntry = await this.findOne<LogEntry>(this._logsDb, { id: logId });

      if (!existingEntry) {
        logger.info(`Log entry not found for update: ${logName}, ID: ${logId}`);
        return false;
      }

      // Save the old entry for statistics update
      const oldEntry = { ...existingEntry } as LogEntry;

      // Create the updated entry
      const newTimestamp = new Date().toISOString();

      // Update the document
      const numUpdated = await this.update(
        this._logsDb,
        { name: logName, id: logId },
        { $set: { data: logData, timestamp: newTimestamp } }
      );

      if (numUpdated > 0) {
        // Create the new entry object for statistics update
        const newEntry: LogEntry = {
          ...oldEntry,
          data: logData,
          timestamp: newTimestamp
        };

        // Log the operation
        logger.debug(`Updated log entry ${logId} in ${logName}`);

        logger.info(`Updated log entry: ${logName}, ID: ${logId}`);
        return true;
      }

      return false;
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
      // Find the entry before removing it
      const entry = await this.findOne(this._logsDb, { name: logName, id: logId }) as LogEntry;

      if (!entry) {
        logger.info(`Log entry not found for deletion: ${logName}, ID: ${logId}`);
        return false;
      }

      // Remove the document
      const numRemoved = await this.remove(this._logsDb, { name: logName, id: logId });

      if (numRemoved > 0) {
        // Log the operation
        logger.debug(`Deleted log entry ${logId} from ${logName}`);

        logger.info(`Deleted log entry: ${logName}, ID: ${logId}`);
        return true;
      } else {
        logger.info(`Log entry not found for deletion: ${logName}, ID: ${logId}`);
        return false;
      }
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
      // Find all documents with the specified log name
      const documents = await this.find(this._logsDb, { name: logName }, { timestamp: -1 }, limit);

      logger.info(`Retrieved ${documents.length} entries for log: ${logName}`);
      return documents;
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
      // Get unique log names
      const logNames = await this.getUniqueLogNames();

      // Limit the number of log names if needed
      const limitedLogNames = logNames.slice(0, limit);

      logger.info(`Retrieved ${limitedLogNames.length} log names`);
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
      // Check if the log exists
      const entries = await this.getLogsByName(logName, 1);
      if (entries.length === 0) {
        logger.info(`Log not found: ${logName}`);
        return false;
      }

      // Log the operation
      logger.debug(`Clearing log ${logName}`);

      // Remove all entries with the specified log name
      const numRemoved = await this.remove(this._logsDb, { name: logName });

      logger.info(`Cleared log: ${logName}, removed ${numRemoved} entries`);
      return true;
    } catch (error) {
      logger.error(`Error clearing log: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Close method is implemented at the end of the file

  /**
   * Ensure the adapter is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Load a database
   *
   * @param db Database to load
   */
  private loadDatabase(db: Datastore): Promise<void> {
    return new Promise((resolve, reject) => {
      db.loadDatabase((err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Create an index
   *
   * @param db Database to create the index in
   * @param fieldName Field to index
   * @param options Index options
   */
  private createIndex(db: Datastore, fieldName: string, options: any): Promise<void> {
    return new Promise((resolve, reject) => {
      db.ensureIndex({ fieldName, ...options }, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Find documents
   *
   * @param db Database to search
   * @param query Query to execute
   * @param sort Sort options
   * @param limit Maximum number of documents to return
   * @returns Array of documents
   */
  /**
   * Get unique log names
   *
   * @returns Array of unique log names
   */
  private async getUniqueLogNames(): Promise<string[]> {
    try {
      // Find all documents and extract unique log names
      const documents = await this.find(this._logsDb, {});
      const logNames = new Set<string>();

      for (const doc of documents) {
        const typedDoc = doc as { name?: string };
        if (typedDoc.name) {
          logNames.add(typedDoc.name);
        }
      }

      return Array.from(logNames);
    } catch (error) {
      logger.error(`Error getting unique log names: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private find<T>(db: Datastore, query: any, sort?: any, limit?: number): Promise<T[]> {
    return new Promise((resolve, reject) => {
      let cursor = db.find(query);

      if (sort) {
        cursor = cursor.sort(sort);
      }

      if (limit) {
        cursor = cursor.limit(limit);
      }

      cursor.exec((err: Error | null, docs: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(docs as T[]);
        }
      });
    });
  }

  /**
   * Find a single document
   *
   * @param db Database to search
   * @param query Query to execute
   * @returns Document or null if not found
   */
  private findOne<T>(db: Datastore, query: any): Promise<T | null> {
    return new Promise((resolve, reject) => {
      db.findOne(query, (err: Error | null, doc: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc as T || null);
        }
      });
    });
  }

  /**
   * Insert a document
   *
   * @param db Database to insert into
   * @param doc Document to insert
   * @returns Inserted document
   */
  private insert<T>(db: Datastore, doc: any): Promise<T> {
    return new Promise((resolve, reject) => {
      db.insert(doc, (err: Error | null, newDoc: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(newDoc as T);
        }
      });
    });
  }

  /**
   * Update a document
   *
   * @param db Database to update
   * @param query Query to find the document
   * @param update Update to apply
   * @param options Update options
   * @returns Number of documents updated
   */
  private update(db: Datastore, query: any, update: any, options: any = {}): Promise<number> {
    return new Promise((resolve, reject) => {
      db.update(query, update, options, (err: Error | null, numAffected: number) => {
        if (err) {
          reject(err);
        } else {
          resolve(numAffected);
        }
      });
    });
  }

  /**
   * Remove documents
   *
   * @param db Database to remove from
   * @param query Query to find the documents
   * @param options Remove options
   * @returns Number of documents removed
   */
  private remove(db: Datastore, query: any, options: any = {}): Promise<number> {
    return new Promise((resolve, reject) => {
      db.remove(query, options, (err: Error | null, numRemoved: number) => {
        if (err) {
          reject(err);
        } else {
          resolve(numRemoved);
        }
      });
    });
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
    let resultCount = 0;

    try {
      // If logName is specified, search only that log, otherwise search all logs
      if (logName) {
        // Get entries for the specified log
        const entries = await this.getLogsByName(logName, 1000);

        // Apply filters
        const filteredEntries = this.filterEntries(entries, {
          query,
          startTime,
          endTime,
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
        const logNames = await this.getLogNames();

        // Search through each log
        for (const name of logNames) {
          if (resultCount >= limit) break;

          // Get entries for this log
          const entries = await this.getLogsByName(name, 1000);

          // Apply filters
          const filteredEntries = this.filterEntries(entries, {
            query,
            startTime,
            endTime,
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

      return results;
    } catch (error) {
      logger.error(`Error searching logs: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
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
    startTime?: string;
    endTime?: string;
    fieldFilters?: Record<string, any>;
  }): any[] {
    const {
      query,
      startTime,
      endTime,
      fieldFilters
    } = options;

    let filteredEntries = [...entries];

    // Apply time filters
    if (startTime) {
      const startTimeMs = new Date(startTime).getTime();
      filteredEntries = filteredEntries.filter(entry =>
        new Date(entry.timestamp).getTime() >= startTimeMs
      );
    }

    if (endTime) {
      const endTimeMs = new Date(endTime).getTime();
      filteredEntries = filteredEntries.filter(entry =>
        new Date(entry.timestamp).getTime() <= endTimeMs
      );
    }

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
   * Count expired logs
   *
   * @param cutoffTime Timestamp before which logs are considered expired
   * @returns Number of expired logs
   */
  public async countExpiredLogs(cutoffTime: number): Promise<number> {
    await this.ensureInitialized();

    try {
      // Count all log entries created before the cutoff time
      const expiredEntries = await this.find<LogEntry>(
        this._logsDb,
        { createdAt: { $lte: cutoffTime } }
      );

      return expiredEntries.length;
    } catch (error) {
      logger.error(`Error counting expired logs for namespace ${this.namespace}:`, error);
      return 0;
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
      const expiredEntries = await this.find<LogEntry>(
        this._logsDb,
        { createdAt: { $lte: cutoffTime } },
        {},
        batchSize
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
          // Delete the log entry
          const numRemoved = await this.remove(
            this._logsDb,
            { id: entry.id, logId: entry.logId }
          );

          if (numRemoved > 0) {
            deletedCount++;
          }
        } catch (error) {
          logger.error(`Error deleting log entry ${entry.id} for namespace ${this.namespace}:`, error);
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
   * Close the adapter
   * This is used to clean up resources when the adapter is no longer needed
   */
  public async close(): Promise<void> {
    this.initialized = false;
    logger.info(`NeDB storage adapter closed for ${SERVER_NAMESPACE}:${this.namespace}`);
  }


}
