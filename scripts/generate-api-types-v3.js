#!/usr/bin/env node

/**
 * Script to generate TypeScript types from OpenAPI schema
 *
 * This script:
 * 1. Reads the OpenAPI schema from src/openapi.yaml
 * 2. Extracts the schema definitions
 * 3. Outputs them to ../typescript-client-sdk/src/types/api.ts
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const OPENAPI_PATH = path.resolve(__dirname, '../src/openapi.yaml');
const TYPES_OUTPUT_PATH = path.resolve(__dirname, '../../typescript-client-sdk/src/types/log.ts');
const TEMPLATE_PATH = path.resolve(__dirname, './api.ts.template');

// Read OpenAPI schema
console.log('Reading OpenAPI schema from', OPENAPI_PATH);
const openApiSchema = yaml.load(fs.readFileSync(OPENAPI_PATH, 'utf8'));

// Extract schema definitions
const schemas = openApiSchema.components.schemas;
console.log(`Found ${Object.keys(schemas).length} schema definitions`);

// Generate TypeScript interfaces
let output = `/**
 * API Types
 *
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT DIRECTLY
 * Generated from OpenAPI schema
 */

// Log Server Types Namespace
export namespace LogServer {
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
`;

// Close the namespace
output += '\n} // end namespace LogServer\n\n// Add convenience type aliases for backward compatibility\nexport type Log = LogServer.Log;\nexport type LogEntry = LogServer.LogEntry;\nexport type LogSearchOptions = LogServer.LogSearchOptions;\nexport type PaginatedResult<T> = LogServer.PaginatedResult<T>;\nexport type BatchAppendResult = LogServer.BatchAppendResult;\nexport type LogEncryptionInfo = LogServer.LogEncryptionInfo;\nexport type EncryptedLogEntry = LogServer.EncryptedLogEntry;\n';
export interface AdminShare {
  /**
   * Admin share ID
   */
  id: string;

  /**
   * User ID
   */
  user_id: string;

  /**
   * Encrypted share
   */
  encrypted_share: string;

  /**
   * Creation date
   */
  created_at: string;
}

export interface AdminShares {
  /**
   * Admin shares
   */
  shares: AdminShare[];
}

export interface AdminShareRequest {
  /**
   * Candidate user ID
   */
  candidate_id: string;

  /**
   * Encrypted share data
   */
  encrypted_share: string;

  /**
   * Public key used for encryption
   */
  public_key: string;

  /**
   * Threshold (number of shares required)
   */
  threshold: number;
}

export interface AdminPromotionRequest {
  /**
   * Request ID
   */
  id: string;

  /**
   * Candidate user ID
   */
  candidate_id: string;

  /**
   * Candidate username
   */
  candidate_name: string;

  /**
   * Requester user ID
   */
  requester_id: string;

  /**
   * Requester username
   */
  requester_name: string;

  /**
   * Request timestamp
   */
  timestamp: string;

  /**
   * Request status
   */
  status: 'pending' | 'approved' | 'rejected';

  /**
   * Threshold (number of approvals required)
   */
  threshold: number;

  /**
   * Number of approvals received
   */
  approvals: number;
}

export interface ApiKeyInfo {
  /**
   * API key ID
   */
  id: string;

  /**
   * API key name
   */
  name: string;

  /**
   * Creation timestamp
   */
  created_at: string;

  /**
   * Expiration timestamp (if applicable)
   */
  expires_at?: string;

  /**
   * Whether the API key is revoked
   */
  revoked: boolean;
}

export interface ApiKeyPermission {
  /**
   * Action (e.g., 'read', 'write')
   */
  action: string;

  /**
   * Resource (e.g., 'logs', 'logs/my-log')
   */
  resource: string;
}

export interface CreateApiKeyRequest {
  /**
   * API key name
   */
  name: string;

  /**
   * Expiration time in days (optional)
   */
  expires_in?: number;

  /**
   * Permissions for this API key
   */
  permissions?: ApiKeyPermission[];
}

export interface KeysList {
  /**
   * API keys
   */
  api_keys: ApiKey[];
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

export interface ApiKeyChallenge {
  /**
   * Challenge string
   */
  challenge: string;

  /**
   * Expiration time in seconds
   */
  expiresIn: number;
}

export interface ApiKeyChallengeVerification {
  /**
   * Whether the challenge response is valid
   */
  valid: boolean;

  /**
   * User ID
   */
  userId?: string;

  /**
   * Tenant ID
   */
  tenantId?: string;

  /**
   * Scopes
   */
  scopes?: string[];
}

export interface UserProfile {
  /**
   * User ID
   */
  id: string;

  /**
   * Email
   */
  email: string;

  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * Name
   */
  name?: string;

  /**
   * Username (optional)
   */
  username?: string;

  /**
   * First name (optional)
   */
  first_name?: string;

  /**
   * Last name (optional)
   */
  last_name?: string;

  /**
   * User roles (optional)
   */
  roles?: string[];
}

export interface User {
  /**
   * User ID
   */
  id: string;

  /**
   * User email
   */
  email: string;

  /**
   * User name
   */
  name?: string;

  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * Whether the user is an admin
   */
  isAdmin?: boolean;

  /**
   * Creation date
   */
  createdAt: string;
}

export interface Login {
  /**
   * Authentication token
   */
  token: string;

  /**
   * User ID
   */
  user_id: string;

  /**
   * Tenant ID
   */
  tenant_id: string;

  /**
   * User profile
   */
  user?: UserProfile;
}

export interface ApiKey {
  /**
   * API key ID
   */
  id: string;

  /**
   * User ID
   */
  userId: string;

  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * API key name
   */
  name: string;

  /**
   * API key scopes
   */
  scopes: string[];

  /**
   * Verification hash for the API key
   */
  verificationHash: string;

  /**
   * When the API key was created
   */
  createdAt: Date;

  /**
   * When the API key expires
   */
  expiresAt: Date;

  /**
   * Whether the API key is revoked
   */
  revoked: boolean;

  /**
   * When the API key was revoked
   */
  revokedAt?: Date;

  /**
   * Last used timestamp
   */
  lastUsedAt?: Date;
}

export interface PermissionCheck {
  /**
   * Whether the user has permission
   */
  allowed: boolean;
}

export interface TokenValidationResult {
  /**
   * Whether the token is valid
   */
  valid: boolean;

  /**
   * User information (if token is valid)
   */
  user?: UserProfile;
}

export interface TokenExchangeResult {
  /**
   * The exchanged token
   */
  token: string;
}

export interface ResourceTokenVerificationResult {
  /**
   * Whether the token is valid
   */
  valid: boolean;

  /**
   * User ID
   */
  userId: string;

  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * Resource
   */
  resource: string;
}

export interface Tenant {
  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * Admin user ID
   */
  adminUserId: string;
}

export interface Role {
  /**
   * Role ID
   */
  id: string;

  /**
   * Role name
   */
  name: string;

  /**
   * Role description
   */
  description?: string;

  /**
   * Role permissions
   */
  permissions: string[];

  /**
   * Roles this role inherits from
   */
  inherits?: string[];

  /**
   * Tenant ID
   */
  tenantId: string;
}

export interface KEKBlob {
  /**
   * User ID
   */
  userId: string;

  /**
   * KEK version ID
   */
  kekVersionId: string;

  /**
   * Encrypted blob
   */
  encryptedBlob: string;

  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * Creation date
   */
  createdAt: string;

  /**
   * Update date
   */
  updatedAt: string;
}

export interface KEKVersion {
  /**
   * KEK version ID
   */
  id: string;

  /**
   * Creation date
   */
  createdAt: string;

  /**
   * Created by user ID
   */
  createdBy: string;

  /**
   * Status
   */
  status: 'active' | 'decrypt-only' | 'deprecated';

  /**
   * Reason for creation
   */
  reason: string;

  /**
   * Tenant ID
   */
  tenantId: string;
}

export interface EncryptedKEK {
  /**
   * Whether the KEK is encrypted
   */
  encrypted: boolean;

  /**
   * Encryption algorithm
   */
  algorithm: string;

  /**
   * Initialization vector
   */
  iv: string;

  /**
   * Encrypted KEK data
   */
  data: string;

  /**
   * KEK version
   */
  version?: string;
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

export interface SerializedSecretShare {
  /**
   * The x-coordinate of the share
   */
  x: number;

  /**
   * The y-coordinate of the share (the actual share value) as a Base64 string
   */
  y: string;
}
`;

// Write the output to the file
fs.writeFileSync(TYPES_OUTPUT_PATH, output);
console.log(`Types written to ${TYPES_OUTPUT_PATH}`);
