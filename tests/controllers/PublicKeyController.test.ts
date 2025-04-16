import { Request, Response } from 'express';
import { publicKeyController } from '../../src/controllers/PublicKeyController';
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

describe('PublicKeyController', () => {
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
  
  describe('storePublicKey', () => {
    it('should store a public key and return success', async () => {
      // Arrange
      mockRequest.body = {
        publicKey: 'test-public-key',
        keyId: 'test-key-id'
      };
      
      // Act
      await publicKeyController.storePublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(
        'public_key:test-tenant:test-user:test-key-id',
        'test-public-key'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Public key stored successfully'
      });
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;
      
      // Act
      await publicKeyController.storePublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
        code: 'unauthorized'
      });
    });
    
    it('should return 400 if publicKey is missing', async () => {
      // Arrange
      mockRequest.body = {
        keyId: 'test-key-id'
      };
      
      // Act
      await publicKeyController.storePublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Public key and key ID are required',
        code: 'bad_request'
      });
    });
    
    it('should return 400 if keyId is missing', async () => {
      // Arrange
      mockRequest.body = {
        publicKey: 'test-public-key'
      };
      
      // Act
      await publicKeyController.storePublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Public key and key ID are required',
        code: 'bad_request'
      });
    });
    
    it('should return 500 if an error occurs', async () => {
      // Arrange
      mockRequest.body = {
        publicKey: 'test-public-key',
        keyId: 'test-key-id'
      };
      mockStorageAdapter.set.mockRejectedValue(new Error('Test error'));
      
      // Act
      await publicKeyController.storePublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    });
  });
  
  describe('getPublicKey', () => {
    it('should get a public key and return it', async () => {
      // Arrange
      mockRequest.params = {
        userId: 'test-user',
        keyId: 'test-key-id'
      };
      mockStorageAdapter.get.mockResolvedValue('test-public-key');
      
      // Act
      await publicKeyController.getPublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.get).toHaveBeenCalledWith(
        'public_key:test-tenant:test-user:test-key-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        publicKey: 'test-public-key'
      });
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;
      
      // Act
      await publicKeyController.getPublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.get).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
        code: 'unauthorized'
      });
    });
    
    it('should return 400 if userId is missing', async () => {
      // Arrange
      mockRequest.params = {
        keyId: 'test-key-id'
      };
      
      // Act
      await publicKeyController.getPublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.get).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User ID and key ID are required',
        code: 'bad_request'
      });
    });
    
    it('should return 400 if keyId is missing', async () => {
      // Arrange
      mockRequest.params = {
        userId: 'test-user'
      };
      
      // Act
      await publicKeyController.getPublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.get).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User ID and key ID are required',
        code: 'bad_request'
      });
    });
    
    it('should return 404 if the public key is not found', async () => {
      // Arrange
      mockRequest.params = {
        userId: 'test-user',
        keyId: 'test-key-id'
      };
      mockStorageAdapter.get.mockResolvedValue(null);
      
      // Act
      await publicKeyController.getPublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.get).toHaveBeenCalledWith(
        'public_key:test-tenant:test-user:test-key-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Public key not found',
        code: 'not_found'
      });
    });
    
    it('should return 500 if an error occurs', async () => {
      // Arrange
      mockRequest.params = {
        userId: 'test-user',
        keyId: 'test-key-id'
      };
      mockStorageAdapter.get.mockRejectedValue(new Error('Test error'));
      
      // Act
      await publicKeyController.getPublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    });
  });
  
  describe('deletePublicKey', () => {
    it('should delete a public key and return success', async () => {
      // Arrange
      mockRequest.params = {
        keyId: 'test-key-id'
      };
      
      // Act
      await publicKeyController.deletePublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.delete).toHaveBeenCalledWith(
        'public_key:test-tenant:test-user:test-key-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Public key deleted successfully'
      });
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;
      
      // Act
      await publicKeyController.deletePublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.delete).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
        code: 'unauthorized'
      });
    });
    
    it('should return 400 if keyId is missing', async () => {
      // Arrange
      mockRequest.params = {};
      
      // Act
      await publicKeyController.deletePublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.delete).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Key ID is required',
        code: 'bad_request'
      });
    });
    
    it('should return 500 if an error occurs', async () => {
      // Arrange
      mockRequest.params = {
        keyId: 'test-key-id'
      };
      mockStorageAdapter.delete.mockRejectedValue(new Error('Test error'));
      
      // Act
      await publicKeyController.deletePublicKey(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'internal_server_error'
      });
    });
  });
  
  describe('listPublicKeys', () => {
    it('should list public keys and return them', async () => {
      // Arrange
      mockRequest.params = {
        userId: 'test-user'
      };
      mockStorageAdapter.list.mockResolvedValue([
        'public_key:test-tenant:test-user:key1',
        'public_key:test-tenant:test-user:key2'
      ]);
      
      // Act
      await publicKeyController.listPublicKeys(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.list).toHaveBeenCalledWith(
        'public_key:test-tenant:test-user:'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        keyIds: ['key1', 'key2']
      });
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;
      
      // Act
      await publicKeyController.listPublicKeys(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.list).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
        code: 'unauthorized'
      });
    });
    
    it('should return 400 if userId is missing', async () => {
      // Arrange
      mockRequest.params = {};
      
      // Act
      await publicKeyController.listPublicKeys(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockStorageAdapter.list).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User ID is required',
        code: 'bad_request'
      });
    });
    
    it('should return 500 if an error occurs', async () => {
      // Arrange
      mockRequest.params = {
        userId: 'test-user'
      };
      mockStorageAdapter.list.mockRejectedValue(new Error('Test error'));
      
      // Act
      await publicKeyController.listPublicKeys(mockRequest as Request, mockResponse as Response);
      
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
