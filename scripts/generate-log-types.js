#!/usr/bin/env node

/**
 * Script to generate TypeScript types from OpenAPI schema
 *
 * This script:
 * 1. Reads the OpenAPI schema from src/openapi.yaml
 * 2. Extracts the schema definitions
 * 3. Outputs them to ../typescript-client-sdk/src/types/log.ts
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const OPENAPI_PATH = path.resolve(__dirname, '../src/openapi.yaml');
const TYPES_OUTPUT_PATH = path.resolve(__dirname, '../../typescript-client-sdk/src/types/log.ts');

// Read OpenAPI schema
console.log('Reading OpenAPI schema from', OPENAPI_PATH);
const openApiSchema = yaml.load(fs.readFileSync(OPENAPI_PATH, 'utf8'));

// Extract schema definitions
const schemas = openApiSchema.components.schemas;
console.log(`Found ${Object.keys(schemas).length} schema definitions`);

// Generate TypeScript interfaces
let output = `/**
 * Log Server API Types
 * 
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT DIRECTLY
 * Generated from OpenAPI schema
 */

`;

// Process each schema
for (const [name, schema] of Object.entries(schemas)) {
  output += `export interface ${name} {\n`;

  // Add required property marker
  const required = schema.required || [];

  // Process properties
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      // Add JSDoc comment if description exists or format exists
      if (propSchema.description || propSchema.format) {
        output += `  /**\n`;
        if (propSchema.description) {
          output += `   * ${propSchema.description}\n`;
        }
        if (propSchema.format) {
          output += `   * @format ${propSchema.format}\n`;
        }
        output += `   */\n`;
      }

      // Determine if property is required
      const isRequired = required.includes(propName);

      // Determine property type
      let propType = 'any';
      if (propSchema.type === 'string') {
        if (propSchema.enum) {
          propType = propSchema.enum.map(v => `"${v}"`).join(' | ');
        } else {
          propType = 'string';
        }
      } else if (propSchema.type === 'integer' || propSchema.type === 'number') {
        propType = 'number';
      } else if (propSchema.type === 'boolean') {
        propType = 'boolean';
      } else if (propSchema.type === 'array') {
        if (propSchema.items.$ref) {
          const refType = propSchema.items.$ref.split('/').pop();
          propType = `${refType}[]`;
        } else if (propSchema.items.type) {
          propType = `${propSchema.items.type === 'integer' ? 'number' : propSchema.items.type}[]`;
        } else {
          propType = 'any[]';
        }
      } else if (propSchema.type === 'object') {
        if (propSchema.properties) {
          propType = '{\n';
          for (const [subPropName, subPropSchema] of Object.entries(propSchema.properties)) {
            if (subPropSchema.description) {
              propType += `    /** ${subPropSchema.description} */\n`;
            }
            let subPropType = 'any';
            if (subPropSchema.type === 'string') {
              subPropType = 'string';
            } else if (subPropSchema.type === 'integer' || subPropSchema.type === 'number') {
              subPropType = 'number';
            } else if (subPropSchema.type === 'boolean') {
              subPropType = 'boolean';
            }
            propType += `    ${subPropName}${subPropSchema.required ? '' : '?'}: ${subPropType};\n`;
          }
          propType += '  }';
        } else {
          propType = 'Record<string, any>';
        }
      } else if (propSchema.$ref) {
        propType = propSchema.$ref.split('/').pop();
      }

      // Add property to output
      output += `  ${propName}${isRequired ? '' : '?'}: ${propType};\n`;
    }
  }

  output += '}\n\n';
}

// Add additional types for API responses
output += `export interface PaginatedResult<T> {
  /** Result items */
  items?: T[];

  /** Result entries (alias for items for backward compatibility) */
  entries: T[];

  /** Total count */
  total: number;

  /** Total count (alias for total for backward compatibility) */
  totalCount: number;

  /** Result limit */
  limit: number;

  /** Result offset */
  offset: number;

  /** Whether there are more results */
  hasMore?: boolean;
}

export interface BatchAppendResult {
  /** Entries with their IDs and timestamps */
  entries: { id: string; timestamp: string }[];
}

// API-specific types
export type GetLogsData = Log[];
export type CreateLogData = Log;
export type GetLogData = Log;
export type UpdateLogData = Log;
export type DeleteLogData = any;
export type GetLogEntriesData = PaginatedLogEntries;
export type SearchLogEntriesData = PaginatedLogEntries;

// Redefine PaginatedLogEntries to match PaginatedResult<LogEntry>
export interface PaginatedLogEntries {
  /** Result items */
  items?: LogEntry[];

  /** Result entries (alias for items for backward compatibility) */
  entries: LogEntry[];

  /** Total count */
  total: number;

  /** Total count (alias for total for backward compatibility) */
  totalCount: number;

  /** Result limit */
  limit: number;

  /** Result offset */
  offset: number;

  /** Whether there are more results */
  hasMore?: boolean;
}

export interface GetLogEntriesParams {
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

export interface AppendLogEntryData {
  /** @example "success" */
  status?: string;
  id?: string;
  /** @format date-time */
  timestamp?: string;
}

export interface BatchAppendLogEntriesPayload {
  entries: LogEntry[];
}

export interface BatchAppendLogEntriesData {
  count?: number;
  entries?: {
    id?: string;
    /** @format date-time */
    timestamp?: string;
  }[];
}

export interface LogEncryptionInfo {
  /**
   * Whether the log is encrypted
   */
  encrypted: boolean;

  /**
   * Encryption algorithm
   */
  algorithm: string;

  /**
   * KEK version used to encrypt the log
   */
  kekVersion: string;
}

export interface EncryptedLogEntry {
  /**
   * Encrypted log data
   */
  data: string;

  /**
   * Initialization vector
   */
  iv: string;

  /**
   * Encryption algorithm
   */
  algorithm: string;

  /**
   * KEK version used to encrypt this log
   */
  kekVersion: string;

  /**
   * Timestamp
   */
  timestamp: string;

  /**
   * Log ID
   */
  id: string;

  /**
   * Search tokens
   */
  searchTokens?: string[];
}
`;

// Write the output to the file
fs.writeFileSync(TYPES_OUTPUT_PATH, output);
console.log(`Types written to ${TYPES_OUTPUT_PATH}`);
