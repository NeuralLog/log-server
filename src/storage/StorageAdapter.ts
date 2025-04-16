import { Log, LogEntry, LogSearchOptions, PaginatedResult, BatchAppendResult } from '@neurallog/client-sdk/dist/types/api';

/**
 * Storage adapter interface for storing log entries
 */
export interface StorageAdapter {
  /**
   * Get the namespace for this storage adapter
   *
   * @returns The namespace for this storage adapter
   */
  getNamespace(): string;

  /**
   * Initialize the storage adapter
   */
  initialize(): Promise<void>;

  /**
   * Store a log entry
   *
   * @param logId Log ID
   * @param logName Log name (already encrypted by the client)
   * @param encryptedData The encrypted log data from the client
   * @param searchTokens Optional search tokens for searchable encryption
   */
  storeLogEntry(logId: string, logName: string, encryptedData: any, searchTokens?: string[]): Promise<void>;

  /**
   * Get a log entry by ID
   *
   * @param logName Log name
   * @param logId Log ID
   * @returns Log entry or null if not found
   */
  getLogEntryById(logName: string, logId: string): Promise<LogEntry | null>;

  /**
   * Update a log entry by ID
   *
   * @param logName Log name
   * @param logId Log ID
   * @param logData Log data
   * @returns True if the log entry was updated, false if it didn't exist
   */
  updateLogEntryById(logName: string, logId: string, logData: any): Promise<boolean>;

  /**
   * Delete a log entry by ID
   *
   * @param logName Log name
   * @param logId Log ID
   * @returns True if the log entry was deleted, false if it didn't exist
   */
  deleteLogEntryById(logName: string, logId: string): Promise<boolean>;

  /**
   * Get logs by name
   *
   * @param logName Log name
   * @param limit Maximum number of logs to return
   * @returns Logs
   */
  getLogsByName(logName: string, limit?: number): Promise<LogEntry[]>;

  /**
   * Get all log names
   *
   * @param limit Maximum number of log names to return (default: 1000)
   * @returns Array of log names
   */
  getLogNames(limit?: number): Promise<string[]>;

  /**
   * Clear a log
   *
   * @param logName Log name
   * @returns True if the log was cleared, false if it didn't exist
   */
  clearLog(logName: string): Promise<boolean>;

  /**
   * Close the storage adapter
   * This is used to clean up resources when the adapter is no longer needed
   */
  close(): Promise<void>;

  /**
   * Search logs based on various criteria
   *
   * @param options Search options
   * @returns Search results
   */
  searchLogs(options: {
    query?: string;
    logName?: string;
    fieldFilters?: Record<string, any>;
    limit?: number;
  }): Promise<Array<{logName: string; entry: LogEntry}>>;

  /**
   * Create a new log
   *
   * @param log Complete Log object
   * @returns Created log
   */
  createLog(log: Log): Promise<Log>;

  /**
   * Get all logs
   *
   * @returns Array of logs
   */
  getLogs(): Promise<Log[]>;

  /**
   * Get a log by name
   *
   * @param name Log name
   * @returns Log or null if not found
   */
  getLog(name: string): Promise<Log | null>;

  /**
   * Update a log
   *
   * @param log Complete Log object
   * @returns Updated log
   */
  updateLog(log: Log): Promise<Log>;

  /**
   * Delete a log
   *
   * @param name Log name
   */
  deleteLog(name: string): Promise<void>;

  /**
   * Append an entry to a log
   *
   * @param logName Log name
   * @param entry Log entry
   * @returns ID of the new entry
   */
  appendLogEntry(logName: string, entry: LogEntry): Promise<string>;

  /**
   * Batch append entries to a log
   *
   * @param logName Log name
   * @param entries Log entries
   * @returns Result with IDs of the new entries
   */
  batchAppendLogEntries(logName: string, entries: LogEntry[]): Promise<BatchAppendResult>;

  /**
   * Get log entries
   *
   * @param logName Log name
   * @param options Options for pagination
   * @returns Paginated result of log entries
   */
  getLogEntries(logName: string, options: { limit?: number; offset?: number }): Promise<PaginatedResult<LogEntry>>;

  /**
   * Get a log entry
   *
   * @param logName Log name
   * @param entryId Entry ID
   * @returns Log entry or null if not found
   */
  getLogEntry(logName: string, entryId: string): Promise<LogEntry | null>;

  /**
   * Search log entries
   *
   * @param logName Log name
   * @param options Search options
   * @returns Paginated result of log entries
   */
  searchLogEntries(logName: string, options: LogSearchOptions): Promise<PaginatedResult<LogEntry>>;

  /**
   * Purge expired logs
   *
   * @param cutoffTime Timestamp before which logs are considered expired
   * @param batchSize Maximum number of logs to purge in one batch
   * @returns Result of the purge operation
   */
  purgeExpiredLogs(cutoffTime: number, batchSize?: number): Promise<{ purgedCount: number }>;

  /**
   * Count expired logs
   *
   * @param cutoffTime Timestamp before which logs are considered expired
   * @returns Number of expired logs
   */
  countExpiredLogs(cutoffTime: number): Promise<number>;
}
