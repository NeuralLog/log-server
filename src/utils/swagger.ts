import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';

// Swagger definition
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NeuralLog API',
      version: '1.0.0',
      description: 'API documentation for the NeuralLog server',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'NeuralLog Support',
        url: 'https://github.com/NeuralLog/server',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Local server',
      },
    ],
    components: {
      schemas: {
        LogEntry: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the log entry',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the log entry was created',
            },
            data: {
              type: 'object',
              description: 'Log entry data',
            },
          },
        },
        LogResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success', 'error'],
              description: 'Response status',
            },
            name: {
              type: 'string',
              description: 'Log name',
            },
            namespace: {
              type: 'string',
              description: 'Namespace',
            },
            entries: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/LogEntry',
              },
              description: 'Log entries',
            },
          },
        },
        LogsResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success', 'error'],
              description: 'Response status',
            },
            namespace: {
              type: 'string',
              description: 'Namespace',
            },
            logs: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of log names',
            },
          },
        },
        LogStatistics: {
          type: 'object',
          properties: {
            totalLogs: {
              type: 'number',
              description: 'Total number of logs',
            },
            totalEntries: {
              type: 'number',
              description: 'Total number of log entries',
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of the last update',
            },
            dailyStats: {
              type: 'object',
              additionalProperties: {
                type: 'number',
              },
              description: 'Daily statistics',
            },
          },
        },
      },
      parameters: {
        logNameParam: {
          name: 'logName',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'Name of the log',
        },
        logIdParam: {
          name: 'logId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'ID of the log entry',
        },
        namespaceParam: {
          name: 'namespace',
          in: 'query',
          schema: {
            type: 'string',
            default: 'default',
          },
          description: 'Namespace for the log',
        },
        limitParam: {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            default: 100,
          },
          description: 'Maximum number of entries to return',
        },
      },
    },
  },
  apis: [__dirname + '/../server/controllers/*.ts', __dirname + '/../server/routes.ts'],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Function to setup Swagger
export const setupSwagger = (app: express.Application): void => {
  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve swagger spec as JSON
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
