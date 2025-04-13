import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import logger from '../utils/logger';
import routes from './routes';
import { setupSwagger } from '../utils/swagger';
import { tokenAuthMiddleware } from '../middleware/tokenAuthMiddleware';
import { apiKeyAuthMiddleware } from '../middleware/apiKeyAuthMiddleware';
import { resourceTokenAuthMiddleware } from '../middleware/resourceTokenAuthMiddleware';

/**
 * NeuralLog server
 */
export class Server {
  private app: express.Application;
  private port: number;

  /**
   * Constructor
   *
   * @param port Port to listen on
   */
  constructor(port: number = 3030) {
    this.app = express();
    this.port = port;

    // Configure middleware
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Add authentication middleware
    this.app.use(tokenAuthMiddleware);
    this.app.use(resourceTokenAuthMiddleware);
    this.app.use(apiKeyAuthMiddleware);

    // Configure routes
    this.app.use('/', routes);

    // Add a root route for health checks
    this.app.get('/', (req, res) => {
      res.json({
        status: 'ok',
        message: 'NeuralLog server is running',
        version: '1.0.0'
      });
    });

    // Setup Swagger
    setupSwagger(this.app);

    // Error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error(`Error: ${err.message}`);
      res.status(500).json({
        status: 'error',
        message: err.message
      });
    });
  }

  /**
   * Start the server
   */
  public start(): void {
    this.app.listen(this.port, '0.0.0.0', () => {
      logger.info(`Server listening on 0.0.0.0:${this.port}`);
    });
  }
}

/**
 * Start the server
 */
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3030;
  const server = new Server(port);
  server.start();
}
