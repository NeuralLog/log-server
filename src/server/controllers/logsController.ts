import { Request, Response } from 'express';
import logger from '../../utils/logger';
import { StorageAdapter } from '../../storage/StorageAdapter';
import { StorageAdapterFactory } from '../../storage/StorageAdapterFactory';
import { NamespacedStorageAdapterFactory } from '../../storage/NamespacedStorageAdapterFactory';
import { v4 as uuidv4 } from 'uuid';
import { LogEntry, Log, PaginatedResult } from '../../types';

// Get configuration from environment variables
const DEFAULT_NAMESPACE = process.env.DEFAULT_NAMESPACE || 'default';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'memory';
const DB_PATH = process.env.DB_PATH || './data';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0;

// Configure storage options
const storageOptions = {
  type: STORAGE_TYPE as 'memory' | 'nedb' | 'redis',
  dbPath: DB_PATH,
  redis: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB
  }
};

// Get the default storage adapter
const storage: StorageAdapter = NamespacedStorageAdapterFactory.getAdapter(DEFAULT_NAMESPACE, storageOptions);

/**
 * Generate a unique ID
 */
function generateId(): string {
  return uuidv4();
}

/**
 * Ensure data is a proper JSON object with a consistent structure
 *
 * @param data Data to process
 * @returns JSON object
 */
function ensureJsonObject(data: any): any {
  // If it's already an object (but not null or array), return it as is
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }

  // If data is null, return an empty object
  if (data === null) {
    return { data: null };
  }

  // If it's a string, check if it's JSON or a primitive
  if (typeof data === 'string') {
    // Trim whitespace for accurate detection
    const trimmed = data.trim();

    // Check if it looks like JSON (starts with { or [ and ends with } or ])
    const looksLikeJson = /^\s*[{\[].*[}\]]\s*$/s.test(trimmed);

    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);
        // If parsing succeeded and result is an object (not array), return it as is
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
        // If it's an array or primitive from JSON, wrap it
        return { data: parsed };
      } catch (e) {
        // If parsing fails, it's not valid JSON, treat as a string
      }
    }

    // Check if it's a number string
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { data: parseFloat(trimmed) };
    }

    // Check if it's a boolean string
    if (trimmed.toLowerCase() === 'true') {
      return { data: true };
    }
    if (trimmed.toLowerCase() === 'false') {
      return { data: false };
    }

    // It's a regular string, wrap it
    return { data: data };
  }

  // For all other types (arrays, primitives), wrap them in a data field
  return { data: data };
}

/**
 * Overwrite a log (clear and add new entries)
 */
export const overwriteLog = async (req: Request, res: Response): Promise<void> => {
  const { logName } = req.params;
  const encryptedData = req.body;
  const namespace = req.query.namespace as string || DEFAULT_NAMESPACE;

  try {
    logger.info(`Overwriting log: ${logName}, namespace: ${namespace}`);

    // Get the storage adapter for this namespace
    const namespaceStorage = NamespacedStorageAdapterFactory.getAdapter(namespace, storageOptions);

    // Clear the log first
    await namespaceStorage.clearLog(logName);

    // Generate a unique ID
    const logId = generateId();

    // Extract search tokens if present
    const searchTokens = encryptedData.searchTokens;

    // Store the encrypted data
    await namespaceStorage.storeLogEntry(logId, logName, encryptedData, searchTokens);

    // Return the created log entry
    res.status(201).json({
      logId,
      namespace
    });
  } catch (error) {
    logger.error(`Error overwriting log: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Append data to a log
 */
export const appendToLog = async (req: Request, res: Response): Promise<void> => {
  const { logName } = req.params;
  const encryptedData = req.body;
  const namespace = req.query.namespace as string || DEFAULT_NAMESPACE;

  try {
    logger.info(`Appending to log: ${logName}, namespace: ${namespace}`);

    // Get the storage adapter for this namespace
    const namespaceStorage = NamespacedStorageAdapterFactory.getAdapter(namespace, storageOptions);

    // Generate a unique ID
    const logId = generateId();

    // Extract search tokens if present
    const searchTokens = encryptedData.searchTokens;

    // Store the encrypted data
    await namespaceStorage.storeLogEntry(logId, logName, encryptedData, searchTokens);

    // Return the created log entry
    res.status(201).json({
      logId,
      namespace
    });
  } catch (error) {
    logger.error(`Error appending to log: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get logs by name
 */
export const getLogByName = async (req: Request, res: Response): Promise<void> => {
  const { logName } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const namespace = req.query.namespace as string || DEFAULT_NAMESPACE;

  try {
    logger.info(`Getting log for: ${logName}, namespace: ${namespace}`);

    // Get the storage adapter for this namespace
    const namespaceStorage = NamespacedStorageAdapterFactory.getAdapter(namespace, storageOptions);

    // Get logs by name
    const entries = await namespaceStorage.getLogsByName(logName, limit);

    // Return the log entries as a paginated result
    const paginatedResult: PaginatedResult<LogEntry> = {
      items: entries,
      total: entries.length,
      entries: entries,
      totalCount: entries.length,
      limit,
      offset: 0,
      hasMore: false
    };
    res.status(200).json(paginatedResult);
  } catch (error) {
    logger.error(`Error getting log: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get all log names
 */
export const getLogs = async (req: Request, res: Response): Promise<void> => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
  const namespace = req.query.namespace as string || DEFAULT_NAMESPACE;

  try {
    logger.info(`Getting all log names, namespace: ${namespace}`);

    // Get the storage adapter for this namespace
    const namespaceStorage = NamespacedStorageAdapterFactory.getAdapter(namespace, storageOptions);

    // Get all log names
    const logNames = await namespaceStorage.getLogNames(limit);

    // Return the log names
    res.status(200).json(logNames);
  } catch (error) {
    logger.error(`Error getting log names: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Clear a log
 */
export const clearLog = async (req: Request, res: Response): Promise<void> => {
  const { logName } = req.params;
  const namespace = req.query.namespace as string || DEFAULT_NAMESPACE;

  try {
    logger.info(`Clearing log: ${logName}, namespace: ${namespace}`);

    // Get the storage adapter for this namespace
    const namespaceStorage = NamespacedStorageAdapterFactory.getAdapter(namespace, storageOptions);

    // Clear the log
    const success = await namespaceStorage.clearLog(logName);

    // Return 204 No Content for successful deletion
    res.status(204).end();
  } catch (error) {
    logger.error(`Error clearing log: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get a log entry by ID
 */
export const getLogEntryById = async (req: Request, res: Response): Promise<void> => {
  const { logName, logId } = req.params;
  const namespace = req.query.namespace as string || DEFAULT_NAMESPACE;

  try {
    logger.info(`Getting log entry: ${logName}, ID: ${logId}, namespace: ${namespace}`);

    // Get the storage adapter for this namespace
    const namespaceStorage = NamespacedStorageAdapterFactory.getAdapter(namespace, storageOptions);

    // Get the log entry
    const entry = await namespaceStorage.getLogEntryById(logName, logId);

    if (entry) {
      // Return the log entry
      res.status(200).json(entry);
    } else {
      res.status(404).json({
        status: 'error',
        error: `Log entry ${logId} not found in log ${logName} (namespace: ${namespace})`
      });
    }
  } catch (error) {
    logger.error(`Error getting log entry: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Update a log entry by ID
 */
export const updateLogEntryById = async (req: Request, res: Response): Promise<void> => {
  const { logName, logId } = req.params;
  const rawData = req.body;
  const namespace = req.query.namespace as string || DEFAULT_NAMESPACE;

  try {
    logger.info(`Updating log entry: ${logName}, ID: ${logId}, namespace: ${namespace}`);

    // Get the storage adapter for this namespace
    const namespaceStorage = NamespacedStorageAdapterFactory.getAdapter(namespace, storageOptions);

    // Ensure data is a proper JSON object
    const data = ensureJsonObject(rawData);

    // Update the log entry
    const success = await namespaceStorage.updateLogEntryById(logName, logId, data);

    if (success) {
      // Return 204 No Content for successful update
      res.status(204).end();
    } else {
      res.status(404).json({
        status: 'error',
        error: `Log entry ${logId} not found in log ${logName} (namespace: ${namespace})`
      });
    }
  } catch (error) {
    logger.error(`Error updating log entry: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Delete a log entry by ID
 */
export const deleteLogEntryById = async (req: Request, res: Response): Promise<void> => {
  const { logName, logId } = req.params;
  const namespace = req.query.namespace as string || DEFAULT_NAMESPACE;

  try {
    logger.info(`Deleting log entry: ${logName}, ID: ${logId}, namespace: ${namespace}`);

    // Get the storage adapter for this namespace
    const namespaceStorage = NamespacedStorageAdapterFactory.getAdapter(namespace, storageOptions);

    // Delete the log entry
    const success = await namespaceStorage.deleteLogEntryById(logName, logId);

    if (success) {
      // Return 204 No Content for successful deletion
      res.status(204).end();
    } else {
      res.status(404).json({
        status: 'error',
        error: `Log entry ${logId} not found in log ${logName} (namespace: ${namespace})`
      });
    }
  } catch (error) {
    logger.error(`Error deleting log entry: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Search logs based on various criteria
 */
export const searchLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract namespace parameter
    const namespace = req.query.namespace as string || DEFAULT_NAMESPACE;

    logger.info(`Searching logs with criteria: ${JSON.stringify(req.query)}, namespace: ${namespace}`);

    // Get the storage adapter for this namespace
    const namespaceStorage = NamespacedStorageAdapterFactory.getAdapter(namespace, storageOptions);

    // Extract search parameters from query string
    const {
      query,
      log_name: logName,
      limit: limitStr,
      namespace: _, // Exclude namespace from otherParams
      ...otherParams
    } = req.query;

    // Parse limit parameter
    const limit = limitStr ? parseInt(limitStr as string) : 100;

    // Extract field filters from other parameters
    const fieldFilters: Record<string, any> = {};
    for (const [key, value] of Object.entries(otherParams)) {
      if (key.startsWith('field_')) {
        const fieldName = key.substring(6); // Remove 'field_' prefix
        fieldFilters[fieldName] = value;
      }
    }

    // Perform the search
    const results = await namespaceStorage.searchLogs({
      query: query as string,
      logName: logName as string,
      fieldFilters: Object.keys(fieldFilters).length > 0 ? fieldFilters : undefined,
      limit
    });

    // Return the search results
    res.status(200).json({
      results,
      total: results.length
    });
  } catch (error) {
    logger.error(`Error searching logs: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};


