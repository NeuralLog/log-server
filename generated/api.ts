/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface NeuralLogLog {
  /** Log ID */
  id?: string;
  /** Log name */
  name: string;
  /** Log description */
  description?: string;
  /** Tenant ID */
  tenantId: string;
  /**
   * Creation timestamp
   * @format date-time
   */
  createdAt?: string;
  /**
   * Last update timestamp
   * @format date-time
   */
  updatedAt?: string;
  /** Number of days to retain log entries */
  retentionDays?: number;
  /** Whether encryption is enabled for this log */
  encryptionEnabled?: boolean;
}

export interface NeuralLogLogUpdate {
  /** Log description */
  description?: string;
  /** Number of days to retain log entries */
  retentionDays?: number;
  /** Whether encryption is enabled for this log */
  encryptionEnabled?: boolean;
}

export interface NeuralLogLogEntry {
  /** Log entry ID */
  id?: string;
  /** Log ID */
  logId: string;
  /**
   * Timestamp
   * @format date-time
   */
  timestamp?: string;
  /** Log entry data */
  data: object;
  /** Search tokens */
  searchTokens?: string[];
  encryptionInfo?: {
    /** Encryption version */
    version?: string;
    /** Encryption algorithm */
    algorithm?: string;
  };
}

export interface NeuralLogLogSearchOptions {
  /** Search query */
  query?: string;
  /** Search tokens */
  searchTokens?: string[];
  /**
   * Start time for search range
   * @format date-time
   */
  startTime?: string;
  /**
   * End time for search range
   * @format date-time
   */
  endTime?: string;
  /**
   * Maximum number of entries to return
   * @min 1
   * @default 10
   */
  limit?: number;
  /**
   * Offset for pagination
   * @min 0
   * @default 0
   */
  offset?: number;
  /**
   * Sort order
   * @default "desc"
   */
  sortOrder?: "asc" | "desc";
}

export interface NeuralLogPaginatedLogEntries {
  entries?: NeuralLogLogEntry[];
  /** Total number of entries */
  total?: number;
  /** Maximum number of entries returned */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Whether there are more entries */
  hasMore?: boolean;
}

export interface NeuralLogError {
  /** @example "error" */
  status: string;
  message: string;
  code?: string;
}

export type NeuralLogGetLogsData = NeuralLogLog[];

export type NeuralLogCreateLogData = NeuralLogLog;

export type NeuralLogGetLogData = NeuralLogLog;

export type NeuralLogUpdateLogData = NeuralLogLog;

export type NeuralLogDeleteLogData = any;

export interface NeuralLogGetLogEntriesParams {
  /**
   * Maximum number of entries to return
   * @min 1
   * @default 10
   */
  limit?: number;
  /**
   * Offset for pagination
   * @min 0
   * @default 0
   */
  offset?: number;
  /** Log name */
  logName: string;
}

export type NeuralLogGetLogEntriesData = NeuralLogPaginatedLogEntries;

export interface NeuralLogAppendLogEntryData {
  /** @example "success" */
  status?: string;
  id?: string;
  /** @format date-time */
  timestamp?: string;
}

export interface NeuralLogBatchAppendLogEntriesPayload {
  entries: NeuralLogLogEntry[];
}

export interface NeuralLogBatchAppendLogEntriesData {
  count?: number;
  entries?: {
    id?: string;
    /** @format date-time */
    timestamp?: string;
  }[];
}

export type NeuralLogSearchLogEntriesData = NeuralLogPaginatedLogEntries;
