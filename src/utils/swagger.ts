import swaggerUi from 'swagger-ui-express';
import express from 'express';
import * as OpenAPIValidator from 'express-openapi-validator';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import logger from './logger';

// Load OpenAPI spec from file
const openApiPath = path.join(__dirname, '..', 'openapi.yaml');
const openApiSpec = yaml.load(fs.readFileSync(openApiPath, 'utf8')) as Record<string, any>;

// Add Permissions tag if it doesn't exist
if (!openApiSpec.tags) {
  openApiSpec.tags = [];
}
if (!openApiSpec.tags.find((tag: any) => tag.name === 'Permissions')) {
  openApiSpec.tags.push({
    name: 'Permissions',
    description: 'Permission management'
  });
}

// Function to setup Swagger and OpenAPI validation
export const setupSwagger = (app: express.Application): void => {
  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Serve swagger spec as JSON
  app.get('/swagger.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  });

  // Setup OpenAPI validation
  app.use(
    OpenAPIValidator.middleware({
      apiSpec: openApiPath,
      validateRequests: true,
      validateResponses: true,
      operationHandlers: false,
    })
  );

  // Add error handler for validation errors
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Format validation errors
    if (err.status === 400 && err.errors) {
      logger.error(`Validation error: ${JSON.stringify(err.errors)}`);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: err.errors,
        code: 'validation_error'
      });
    }

    // Pass other errors to the next handler
    next(err);
  });
};
