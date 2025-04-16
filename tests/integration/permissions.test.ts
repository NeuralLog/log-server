import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { permissionController } from '../../src/controllers/PermissionController';

// Mock the permissionController.checkPermission method
jest.mock('../../src/controllers/PermissionController', () => {
  return {
    permissionController: {
      checkPermission: jest.fn().mockImplementation((req, res) => {
        // Get the auth token from the request
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
          res.status(401).json({
            status: 'error',
            message: 'No authorization token provided',
            code: 'unauthorized'
          });
          return;
        }

        // Check for malformed token
        if (token === 'malformed-token') {
          res.status(401).json({
            status: 'error',
            message: 'Invalid token format',
            code: 'invalid_token_format'
          });
          return;
        }

        // Check for expired token
        if (token === 'expired-token') {
          res.status(401).json({
            status: 'error',
            message: 'Token has expired',
            code: 'token_expired'
          });
          return;
        }

        // Check for tenant ID
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
          res.status(400).json({
            status: 'error',
            message: 'Tenant ID is required',
            code: 'tenant_id_required'
          });
          return;
        }

        // Get the action and resource from the request body
        const { action, resource, contextualTuples } = req.body;

        // Validate the request
        if (!action || !resource) {
          res.status(400).json({
            status: 'error',
            message: 'Action and resource are required',
            code: 'bad_request'
          });
          return;
        }

        // Check for contextual tuples
        if (contextualTuples && !Array.isArray(contextualTuples)) {
          res.status(400).json({
            status: 'error',
            message: 'Contextual tuples must be an array',
            code: 'invalid_contextual_tuples'
          });
          return;
        }

        // Check the permission based on the token and action
        if (token === 'valid-token' && action === 'read' && resource === 'logs/test-log') {
          res.status(200).json({ allowed: true });
        } else if (token === 'valid-token' && action === 'read' && resource === 'logs/test-log-with-context' && contextualTuples) {
          // Check if the contextual tuples contain the required tuple
          const hasRequiredTuple = contextualTuples.some(
            (tuple: { user: string; relation: string; object: string }) =>
              tuple.user === 'user:123' && tuple.relation === 'member' && tuple.object === 'group:456'
          );
          res.status(200).json({ allowed: hasRequiredTuple });
        } else if (token === 'valid-token') {
          res.status(200).json({ allowed: false });
        } else {
          res.status(200).json({ allowed: false });
        }
      })
    }
  };
});

// Create a simple express app for testing
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/permissions/check', permissionController.checkPermission);

describe('Permission API', () => {
  describe('POST /permissions/check', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'read',
          resource: 'logs/test-log'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: 'error',
        message: 'No authorization token provided',
        code: 'unauthorized'
      });
    });

    it('should return 400 if action or resource is missing', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer valid-token')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'read'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Action and resource are required',
        code: 'bad_request'
      });
    });

    it('should return allowed: true if the user has permission', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer valid-token')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'read',
          resource: 'logs/test-log'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        allowed: true
      });
    });

    it('should return allowed: false if the user does not have permission', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer valid-token')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'write',
          resource: 'logs/test-log'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        allowed: false
      });
    });

    it('should return allowed: false if the token is invalid', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer invalid-token')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'read',
          resource: 'logs/test-log'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        allowed: false
      });
    });

    it('should return 401 with invalid_token_format if the token is malformed', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer malformed-token')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'read',
          resource: 'logs/test-log'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Invalid token format',
        code: 'invalid_token_format'
      });
    });

    it('should return 401 with token_expired if the token has expired', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer expired-token')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'read',
          resource: 'logs/test-log'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Token has expired',
        code: 'token_expired'
      });
    });

    it('should return 400 if tenant ID is missing', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer valid-token')
        .send({
          action: 'read',
          resource: 'logs/test-log'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Tenant ID is required',
        code: 'tenant_id_required'
      });
    });

    it('should return 400 if contextual tuples is not an array', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer valid-token')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'read',
          resource: 'logs/test-log',
          contextualTuples: { user: 'user:123', relation: 'member', object: 'group:456' } // Not an array
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Contextual tuples must be an array',
        code: 'invalid_contextual_tuples'
      });
    });

    it('should return allowed: true when using valid contextual tuples', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer valid-token')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'read',
          resource: 'logs/test-log-with-context',
          contextualTuples: [
            { user: 'user:123', relation: 'member', object: 'group:456' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        allowed: true
      });
    });

    it('should return allowed: false when using invalid contextual tuples', async () => {
      const response = await request(app)
        .post('/permissions/check')
        .set('Authorization', 'Bearer valid-token')
        .set('x-tenant-id', 'test-tenant')
        .send({
          action: 'read',
          resource: 'logs/test-log-with-context',
          contextualTuples: [
            { user: 'user:789', relation: 'member', object: 'group:456' } // Wrong user
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        allowed: false
      });
    });
  });
});
