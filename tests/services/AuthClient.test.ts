import { AuthClient } from '../../src/services/AuthClient';
import { AuthService } from '@neurallog/client-sdk';
import { DiscoveryService } from '../../src/services/DiscoveryService';
import { CacheService } from '../../src/services/CacheService';

// Mock the DiscoveryService
jest.mock('../../src/services/DiscoveryService', () => {
  return {
    DiscoveryService: {
      getInstance: jest.fn().mockReturnValue({
        getAuthUrl: jest.fn().mockResolvedValue('http://localhost:3000')
      })
    }
  };
});

// Mock the CacheService
jest.mock('../../src/services/CacheService', () => {
  return {
    CacheService: {
      getInstance: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
        set: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        getOrCompute: jest.fn().mockImplementation(async (key, factory) => {
          return await factory();
        })
      })
    }
  };
});

// Mock the AuthService
jest.mock('@neurallog/client-sdk', () => {
  return {
    AuthService: jest.fn().mockImplementation(() => {
      return {
        verifyResourceToken: jest.fn().mockResolvedValue({
          valid: true,
          userId: 'test-user',
          tenantId: 'test-tenant',
          resource: 'logs'
        }),
        validateApiKey: jest.fn().mockResolvedValue(true),
        checkPermission: jest.fn().mockResolvedValue(true),
        getBaseUrl: jest.fn().mockReturnValue('http://localhost:3000'),
        setBaseUrl: jest.fn()
      };
    })
  };
});

describe('AuthClient', () => {
  let authClient: AuthClient;
  let mockAuthService: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a new instance of AuthClient
    authClient = new AuthClient('http://localhost:3000');

    // Get the mocked AuthService instance
    mockAuthService = (AuthService as jest.Mock).mock.results[0].value;
  });

  describe('verifyResourceToken', () => {
    it('should verify a resource token and return the result', async () => {
      // Arrange
      const token = 'test-token';
      mockAuthService.verifyResourceToken.mockResolvedValueOnce({
        valid: true,
        userId: 'test-user',
        tenantId: 'test-tenant',
        resource: 'logs'
      });

      // Act
      const result = await authClient.verifyResourceToken(token);

      // Assert
      expect(mockAuthService.verifyResourceToken).toHaveBeenCalledWith(token);
      expect(result).toEqual({
        valid: true,
        userId: 'test-user',
        tenantId: 'test-tenant',
        resource: 'logs'
      });
    });

    it('should return { valid: false } if verifyResourceToken throws an error', async () => {
      // Arrange
      const token = 'test-token';
      mockAuthService.verifyResourceToken.mockRejectedValueOnce(new Error('Test error'));

      // Act
      const result = await authClient.verifyResourceToken(token);

      // Assert
      expect(mockAuthService.verifyResourceToken).toHaveBeenCalledWith(token);
      expect(result).toEqual({ valid: false });
    });
  });

  describe('verifyApiKey', () => {
    it('should verify an API key and return the result', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      const tenantId = 'test-tenant';

      // Mock getApiKeyMetadata
      jest.spyOn(authClient, 'getApiKeyMetadata').mockResolvedValueOnce({
        apiKey: {
          userId: 'test-user'
        }
      });

      // Mock validateApiKey
      mockAuthService.validateApiKey.mockResolvedValueOnce(true);

      // Act
      const result = await authClient.verifyApiKey(apiKey, tenantId);

      // Assert
      expect(mockAuthService.validateApiKey).toHaveBeenCalledWith(apiKey);
      expect(authClient.getApiKeyMetadata).toHaveBeenCalledWith(apiKey.split('.')[0], tenantId);
      expect(result).toEqual({
        valid: true,
        userId: 'test-user'
      });
    });

    it('should return { valid: false } if validateApiKey returns false', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      const tenantId = 'test-tenant';
      mockAuthService.validateApiKey.mockResolvedValueOnce(false);

      // Act
      const result = await authClient.verifyApiKey(apiKey, tenantId);

      // Assert
      expect(mockAuthService.validateApiKey).toHaveBeenCalledWith(apiKey);
      expect(result).toEqual({ valid: false });
    });

    it('should return { valid: false } if getApiKeyMetadata returns an error', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      const tenantId = 'test-tenant';
      mockAuthService.validateApiKey.mockResolvedValueOnce(true);
      jest.spyOn(authClient, 'getApiKeyMetadata').mockResolvedValueOnce({
        error: 'Test error'
      });

      // Act
      const result = await authClient.verifyApiKey(apiKey, tenantId);

      // Assert
      expect(mockAuthService.validateApiKey).toHaveBeenCalledWith(apiKey);
      expect(authClient.getApiKeyMetadata).toHaveBeenCalledWith(apiKey.split('.')[0], tenantId);
      expect(result).toEqual({ valid: false });
    });

    it('should return { valid: false } if validateApiKey throws an error', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      const tenantId = 'test-tenant';
      mockAuthService.validateApiKey.mockRejectedValueOnce(new Error('Test error'));

      // Act
      const result = await authClient.verifyApiKey(apiKey, tenantId);

      // Assert
      expect(mockAuthService.validateApiKey).toHaveBeenCalledWith(apiKey);
      expect(result).toEqual({ valid: false });
    });
  });

  describe('checkPermission', () => {
    it('should check permission and return the result', async () => {
      // Arrange
      const token = 'test-token';
      const action = 'read';
      const resource = 'logs/test-log';
      mockAuthService.checkPermission.mockResolvedValueOnce(true);

      // Act
      const result = await authClient.checkPermission(token, action, resource);

      // Assert
      expect(mockAuthService.checkPermission).toHaveBeenCalledWith(token, action, resource);
      expect(result).toBe(true);
    });

    it('should return false if checkPermission returns false', async () => {
      // Arrange
      const token = 'test-token';
      const action = 'write';
      const resource = 'logs/test-log';
      mockAuthService.checkPermission.mockResolvedValueOnce(false);

      // Act
      const result = await authClient.checkPermission(token, action, resource);

      // Assert
      expect(mockAuthService.checkPermission).toHaveBeenCalledWith(token, action, resource);
      expect(result).toBe(false);
    });

    it('should return false if checkPermission throws an error', async () => {
      // Arrange
      const token = 'test-token';
      const action = 'delete';
      const resource = 'logs/test-log';
      mockAuthService.checkPermission.mockRejectedValueOnce(new Error('Test error'));

      // Act
      const result = await authClient.checkPermission(token, action, resource);

      // Assert
      expect(mockAuthService.checkPermission).toHaveBeenCalledWith(token, action, resource);
      expect(result).toBe(false);
    });
  });
});
