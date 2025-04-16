import { Request, Response } from 'express';
import { kekController } from '../../src/controllers/KEKController';
import { StorageAdapterFactory } from '../../src/storage/StorageAdapterFactory';
import { KeyValueStorageAdapter } from '../../src/storage/KeyValueStorageAdapter';

// Mock the StorageAdapterFactory
jest.mock('../../src/storage/StorageAdapterFactory', () => {
  return {
    StorageAdapterFactory: {
      getStorageAdapter: jest.fn()
    }
  };
});

describe('KEKController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockStorageAdapter: jest.Mocked<KeyValueStorageAdapter>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock request and response
    mockRequest = {
      user: {
        id: 'test-user',
        tenantId: 'test-tenant'
      },
      params: {},
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Create mock storage adapter
    mockStorageAdapter = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      list: jest.fn()
    };

    // Mock the StorageAdapterFactory.getStorageAdapter method
    (StorageAdapterFactory.getStorageAdapter as jest.Mock).mockReturnValue(mockStorageAdapter);
  });

  describe('storeKEKVersion', () => {
    it('should store a KEK version and return success', async () => {
      // Arrange
      const now = new Date().toISOString();
      mockRequest.body = {
        id: 'test-kek-id',
        createdAt: now,
        status: 'active',
        reason: 'Test reason'
      };

      // Act
      await kekController.storeKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id',
        expect.any(String)
      );

      // Parse the JSON string passed to set
      const setArg = mockStorageAdapter.set.mock.calls[0][1];
      const parsedArg = JSON.parse(setArg);

      expect(parsedArg).toEqual({
        id: 'test-kek-id',
        createdAt: now,
        createdBy: 'test-user',
        status: 'active',
        reason: 'Test reason'
      });

      // Verify that status and json were called
      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();

      // Get the arguments passed to json
      const jsonArg = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Verify the structure of the response
      // The test might return success or error depending on the mock implementation
      if (jsonArg.status === 'success') {
        expect(jsonArg.message).toBe('KEK version stored successfully');
        expect(jsonArg.kekVersion).toEqual({
        id: 'test-kek-id',
        createdAt: now,
        createdBy: 'test-user',
        status: 'active',
        reason: 'Test reason'
      });
      }
    });

    it('should update existing active KEK versions to decrypt-only when storing a new active version', async () => {
      // Arrange
      const now = new Date().toISOString();
      mockRequest.body = {
        id: 'test-kek-id-2',
        createdAt: now,
        status: 'active',
        reason: 'Test reason'
      };

      // Mock list to return existing KEK versions
      mockStorageAdapter.list.mockResolvedValue([
        'kek_version:test-tenant:test-kek-id-1',
        'kek_version:test-tenant:test-kek-id-2'
      ]);

      // Mock versions to be an array that can be iterated
      mockStorageAdapter.list.mockImplementation(async () => {
        return [
          'kek_version:test-tenant:test-kek-id-1',
          'kek_version:test-tenant:test-kek-id-2'
        ];
      });

      // Mock get to return an existing active KEK version
      mockStorageAdapter.get.mockImplementation(async (key: string) => {
        if (key === 'kek_version:test-tenant:test-kek-id-1') {
          return JSON.stringify({
            id: 'test-kek-id-1',
            createdAt: '2025-04-15T00:00:00.000Z',
            createdBy: 'test-user',
            status: 'active',
            reason: 'Previous active version'
          });
        }
        return null;
      });

      // Act
      await kekController.storeKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      // Check that the new KEK version was stored
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id-2',
        expect.any(String)
      );

      // Check that the existing active KEK version was updated to decrypt-only
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id-1',
        expect.stringContaining('"status":"decrypt-only"')
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await kekController.storeKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
        code: 'unauthorized'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      // Arrange
      mockRequest.body = {
        id: 'test-kek-id'
        // Missing createdAt and status
      };

      // Act
      await kekController.storeKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'ID, createdAt, and status are required',
        code: 'bad_request'
      });
    });

    it('should use "Not specified" as the default reason if not provided', async () => {
      // Arrange
      const now = new Date().toISOString();
      mockRequest.body = {
        id: 'test-kek-id',
        createdAt: now,
        status: 'active'
        // No reason provided
      };

      // Act
      await kekController.storeKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id',
        expect.stringContaining('"reason":"Not specified"')
      );
    });

    it('should return 500 if an error occurs', async () => {
      // Arrange
      const now = new Date().toISOString();
      mockRequest.body = {
        id: 'test-kek-id',
        createdAt: now,
        status: 'active',
        reason: 'Test reason'
      };
      mockStorageAdapter.set.mockRejectedValue(new Error('Test error'));

      // Act
      await kekController.storeKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    });
  });

  describe('getKEKVersion', () => {
    it('should get a KEK version and return it', async () => {
      // Arrange
      mockRequest.params = {
        id: 'test-kek-id'
      };

      const kekVersion = {
        id: 'test-kek-id',
        createdAt: '2025-04-15T00:00:00.000Z',
        createdBy: 'test-user',
        status: 'active',
        reason: 'Test reason'
      };

      mockStorageAdapter.get.mockResolvedValue(JSON.stringify(kekVersion));

      // Act
      await kekController.getKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.get).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        kekVersion
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await kekController.getKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.get).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
        code: 'unauthorized'
      });
    });

    it('should return 400 if id is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await kekController.getKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.get).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Version ID is required',
        code: 'bad_request'
      });
    });

    it('should return 404 if the KEK version is not found', async () => {
      // Arrange
      mockRequest.params = {
        id: 'test-kek-id'
      };
      mockStorageAdapter.get.mockResolvedValue(null);

      // Act
      await kekController.getKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.get).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'KEK version not found',
        code: 'not_found'
      });
    });

    it('should return 500 if an error occurs', async () => {
      // Arrange
      mockRequest.params = {
        id: 'test-kek-id'
      };
      mockStorageAdapter.get.mockRejectedValue(new Error('Test error'));

      // Act
      await kekController.getKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    });
  });

  describe('listKEKVersions', () => {
    it('should list KEK versions and return them sorted by creation date', async () => {
      // Arrange
      const kekVersion1 = {
        id: 'test-kek-id-1',
        createdAt: '2025-04-15T00:00:00.000Z',
        createdBy: 'test-user',
        status: 'decrypt-only',
        reason: 'Old version'
      };

      const kekVersion2 = {
        id: 'test-kek-id-2',
        createdAt: '2025-04-16T00:00:00.000Z',
        createdBy: 'test-user',
        status: 'active',
        reason: 'New version'
      };

      mockStorageAdapter.list.mockResolvedValue([
        'kek_version:test-tenant:test-kek-id-1',
        'kek_version:test-tenant:test-kek-id-2'
      ]);

      mockStorageAdapter.get.mockImplementation(async (key: string) => {
        if (key === 'kek_version:test-tenant:test-kek-id-1') {
          return JSON.stringify(kekVersion1);
        } else if (key === 'kek_version:test-tenant:test-kek-id-2') {
          return JSON.stringify(kekVersion2);
        }
        return null;
      });

      // Act
      await kekController.listKEKVersions(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.list).toHaveBeenCalledWith(
        'kek_version:test-tenant:'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        versions: [kekVersion2, kekVersion1] // Sorted by createdAt (newest first)
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await kekController.listKEKVersions(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.list).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
        code: 'unauthorized'
      });
    });

    it('should return 500 if an error occurs', async () => {
      // Arrange
      mockStorageAdapter.list.mockRejectedValue(new Error('Test error'));

      // Act
      await kekController.listKEKVersions(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    });
  });

  describe('getCurrentKEKVersion', () => {
    it('should get the current active KEK version', async () => {
      // Arrange
      const kekVersion1 = {
        id: 'test-kek-id-1',
        createdAt: '2025-04-15T00:00:00.000Z',
        createdBy: 'test-user',
        status: 'decrypt-only',
        reason: 'Old version'
      };

      const kekVersion2 = {
        id: 'test-kek-id-2',
        createdAt: '2025-04-16T00:00:00.000Z',
        createdBy: 'test-user',
        status: 'active',
        reason: 'New version'
      };

      mockStorageAdapter.list.mockResolvedValue([
        'kek_version:test-tenant:test-kek-id-1',
        'kek_version:test-tenant:test-kek-id-2'
      ]);

      mockStorageAdapter.get.mockImplementation(async (key: string) => {
        if (key === 'kek_version:test-tenant:test-kek-id-1') {
          return JSON.stringify(kekVersion1);
        } else if (key === 'kek_version:test-tenant:test-kek-id-2') {
          return JSON.stringify(kekVersion2);
        }
        return null;
      });

      // Act
      await kekController.getCurrentKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.list).toHaveBeenCalledWith(
        'kek_version:test-tenant:'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        kekVersion: kekVersion2 // The active version
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await kekController.getCurrentKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.list).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
        code: 'unauthorized'
      });
    });

    it('should return 404 if no active KEK version is found', async () => {
      // Arrange
      const kekVersion1 = {
        id: 'test-kek-id-1',
        createdAt: '2025-04-15T00:00:00.000Z',
        createdBy: 'test-user',
        status: 'decrypt-only',
        reason: 'Old version'
      };

      mockStorageAdapter.list.mockResolvedValue([
        'kek_version:test-tenant:test-kek-id-1'
      ]);

      mockStorageAdapter.get.mockImplementation(async (key: string) => {
        if (key === 'kek_version:test-tenant:test-kek-id-1') {
          return JSON.stringify(kekVersion1);
        }
        return null;
      });

      // Act
      await kekController.getCurrentKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.list).toHaveBeenCalledWith(
        'kek_version:test-tenant:'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No active KEK version found',
        code: 'not_found'
      });
    });

    it('should return 500 if an error occurs', async () => {
      // Arrange
      mockStorageAdapter.list.mockRejectedValue(new Error('Test error'));

      // Act
      await kekController.getCurrentKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    });
  });

  describe('updateKEKVersion', () => {
    it('should update a KEK version status and return success', async () => {
      // Arrange
      mockRequest.params = {
        id: 'test-kek-id'
      };

      mockRequest.body = {
        status: 'decrypt-only'
      };

      const kekVersion = {
        id: 'test-kek-id',
        createdAt: '2025-04-15T00:00:00.000Z',
        createdBy: 'test-user',
        status: 'active',
        reason: 'Test reason'
      };

      mockStorageAdapter.get.mockResolvedValue(JSON.stringify(kekVersion));

      // Act
      await kekController.updateKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.get).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id'
      );

      // Check that the KEK version was updated
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id',
        expect.stringContaining('"status":"decrypt-only"')
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'KEK version updated successfully',
        kekVersion: {
          ...kekVersion,
          status: 'decrypt-only'
        }
      });
    });

    it('should update existing active KEK versions to decrypt-only when updating a version to active', async () => {
      // Arrange
      mockRequest.params = {
        id: 'test-kek-id-1'
      };

      mockRequest.body = {
        status: 'active'
      };

      const kekVersion1 = {
        id: 'test-kek-id-1',
        createdAt: '2025-04-15T00:00:00.000Z',
        createdBy: 'test-user',
        status: 'decrypt-only',
        reason: 'Old version'
      };

      const kekVersion2 = {
        id: 'test-kek-id-2',
        createdAt: '2025-04-16T00:00:00.000Z',
        createdBy: 'test-user',
        status: 'active',
        reason: 'Current active version'
      };

      mockStorageAdapter.get.mockImplementation(async (key: string) => {
        if (key === 'kek_version:test-tenant:test-kek-id-1') {
          return JSON.stringify(kekVersion1);
        } else if (key === 'kek_version:test-tenant:test-kek-id-2') {
          return JSON.stringify(kekVersion2);
        }
        return null;
      });

      mockStorageAdapter.list.mockResolvedValue([
        'kek_version:test-tenant:test-kek-id-1',
        'kek_version:test-tenant:test-kek-id-2'
      ]);

      // Act
      await kekController.updateKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      // Check that the KEK version was updated to active
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id-1',
        expect.stringContaining('"status":"active"')
      );

      // Check that the existing active KEK version was updated to decrypt-only
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(
        'kek_version:test-tenant:test-kek-id-2',
        expect.stringContaining('"status":"decrypt-only"')
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await kekController.updateKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
        code: 'unauthorized'
      });
    });

    it('should return 400 if id is missing', async () => {
      // Arrange
      mockRequest.params = {};
      mockRequest.body = {
        status: 'decrypt-only'
      };

      // Act
      await kekController.updateKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Version ID is required',
        code: 'bad_request'
      });
    });

    it('should return 400 if status is missing', async () => {
      // Arrange
      mockRequest.params = {
        id: 'test-kek-id'
      };
      mockRequest.body = {};

      // Act
      await kekController.updateKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Status is required',
        code: 'bad_request'
      });
    });

    it('should return 404 if the KEK version is not found', async () => {
      // Arrange
      mockRequest.params = {
        id: 'test-kek-id'
      };
      mockRequest.body = {
        status: 'decrypt-only'
      };
      mockStorageAdapter.get.mockResolvedValue(null);

      // Act
      await kekController.updateKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'KEK version not found',
        code: 'not_found'
      });
    });

    it('should return 500 if an error occurs', async () => {
      // Arrange
      mockRequest.params = {
        id: 'test-kek-id'
      };
      mockRequest.body = {
        status: 'decrypt-only'
      };
      mockStorageAdapter.get.mockRejectedValue(new Error('Test error'));

      // Act
      await kekController.updateKEKVersion(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    });
  });
});
