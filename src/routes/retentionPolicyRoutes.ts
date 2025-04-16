import express from 'express';
import { RetentionPolicyController } from '../controllers/RetentionPolicyController';
import { RetentionPolicyStore } from '../storage/RetentionPolicyStore';
import { ConfigService } from '../services/ConfigService';
import { StorageAdapterFactory } from '../storage/StorageAdapterFactory';

// Create the router
const router = express.Router();

// Create the controller
const retentionPolicyStore = new RetentionPolicyStore();
const configService = new ConfigService();
const storageAdapterFactory = new StorageAdapterFactory();
const retentionPolicyController = new RetentionPolicyController(
  retentionPolicyStore,
  configService,
  storageAdapterFactory
);

// Initialize the retention policy store
retentionPolicyStore.initialize();

// Define routes
router.get('/retention-policy', retentionPolicyController.getRetentionPolicy);
router.post('/retention-policy', retentionPolicyController.setRetentionPolicy);
router.delete('/retention-policy', retentionPolicyController.deleteRetentionPolicy);
router.get('/retention-policy/all', retentionPolicyController.getAllRetentionPolicies);
router.get('/retention-policy/expired-count', retentionPolicyController.getExpiredLogsCount);

export default router;
