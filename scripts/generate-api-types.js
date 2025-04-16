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
 * NeuralLog API Types
 *
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT DIRECTLY
 * Generated from OpenAPI schema using swagger-typescript-api
 */

`)
    // Fix any issues with the generated types
    .replace(/NeuralLog/g, '')
    // Remove any client-specific code that might have been generated
    .replace(/export class .*?{[\s\S]*?}/g, '');

  // Write the processed types to the final location
  fs.writeFileSync(TYPES_OUTPUT_PATH, processedTypes);
  console.log(`Types written to ${TYPES_OUTPUT_PATH}`);

} catch (error) {
  console.error('Error generating types:', error);
  process.exit(1);
}
