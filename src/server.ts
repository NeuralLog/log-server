import { Server } from './server/server';
import logger from './utils/logger';
import { DiscoveryService } from './services/DiscoveryService';

/**
 * Start the NeuralLog server
 */
const port = process.env.PORT ? parseInt(process.env.PORT) : 3030;
logger.info(`Starting NeuralLog server on port ${port}`);

// Initialize the discovery service
const discoveryService = DiscoveryService.getInstance();
logger.info(`Using tenant ID: ${discoveryService.getTenantId()}`);

// Start the server
const server = new Server(port);
server.start();
