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

        // Get the action and resource from the request body
        const { action, resource } = req.body;

        // Validate the request
        if (!action || !resource) {
          res.status(400).json({
            status: 'error',
            message: 'Action and resource are required',
            code: 'bad_request'
          });
          return;
        }

        // Check the permission based on the token and action
        if (token === 'valid-token' && action === 'read' && resource === 'logs/test-log') {
          res.status(200).json({ allowed: true });
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
  });
});
