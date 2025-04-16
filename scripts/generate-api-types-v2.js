#!/usr/bin/env node

/**
 * Script to generate TypeScript types from OpenAPI schema
 *
 * This script:
 * 1. Reads the OpenAPI schema from src/openapi.yaml
 * 2. Generates TypeScript types
 * 3. Outputs them to ../typescript-client-sdk/src/types/api.ts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const OPENAPI_PATH = path.resolve(__dirname, '../src/openapi.yaml');
const OUTPUT_DIR = path.resolve(__dirname, '../generated');
const TYPES_OUTPUT_PATH = path.resolve(__dirname, '../../typescript-client-sdk/src/types/api.ts');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read OpenAPI schema
console.log('Reading OpenAPI schema from', OPENAPI_PATH);
const openApiSchema = yaml.load(fs.readFileSync(OPENAPI_PATH, 'utf8'));

// Generate types using swagger-typescript-api
console.log('Generating TypeScript types...');
try {
  execSync(
    `npx swagger-typescript-api generate -p ${OPENAPI_PATH} -o ${OUTPUT_DIR} -n api.ts --no-client --enum-names-as-values --type-prefix NeuralLog --extract-request-params --extract-request-body --extract-response-body --extract-response-error`,
    { stdio: 'inherit' }
  );

  console.log('Types generated successfully!');

  // Read the generated file
  const generatedTypes = fs.readFileSync(path.join(OUTPUT_DIR, 'api.ts'), 'utf8');

  // Process the file to make it more suitable for our needs
  let processedTypes = generatedTypes
    // Remove imports we don't need
    .replace(/import \{ .*? \} from "\.\/.*?";(\r?\n)+/g, '')
    // Add our header
    .replace(/^/, `/**
 * API Types
 *
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT DIRECTLY
 * Generated from OpenAPI schema using swagger-typescript-api
 */

`)
    // Fix any issues with the generated types
    .replace(/NeuralLog/g, '')
    // Remove any client-specific code that might have been generated
    .replace(/export class .*?{[\s\S]*?}/g, '');

  // Add PaginatedResult interface to match existing code
  processedTypes = processedTypes.replace(/export interface PaginatedLogEntries {[\s\S]*?}/g,
    `export interface PaginatedResult<T> {
  /** Result items */
  items?: T[];

  /** Result entries (alias for items for backward compatibility) */
  entries: T[];

  /** Total count */
  total: number;

  /** Result limit */
  limit: number;

  /** Result offset */
  offset: number;

  /** Whether there are more results */
  hasMore?: boolean;
}

export interface PaginatedLogEntries extends PaginatedResult<LogEntry> {}`);

  // Add BatchAppendResult interface
  processedTypes = processedTypes.replace(/export interface BatchAppendLogEntriesData {[\s\S]*?}/g,
    `export interface BatchAppendResult {
  /** Entries with their IDs and timestamps */
  entries: { id: string; timestamp: string }[];
}

export interface BatchAppendLogEntriesData {
  count?: number;
  entries?: {
    id?: string;
    /** @format date-time */
    timestamp?: string;
  }[];
}`);

  // Fix any syntax errors
  processedTypes = processedTypes.replace(/}\[\];\[\];/g, '}[];');
  processedTypes = processedTypes.replace(/export interface BatchAppendResult {([\s\S]*?)export interface/g, 'export interface BatchAppendResult {$1}\n\nexport interface');

  // Write the processed types to the final location
  fs.writeFileSync(TYPES_OUTPUT_PATH, processedTypes);
  console.log(`Types written to ${TYPES_OUTPUT_PATH}`);

} catch (error) {
  console.error('Error generating types:', error);
  process.exit(1);
}
