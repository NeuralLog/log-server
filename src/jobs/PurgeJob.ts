import cron from 'node-cron';
import logger from '../utils/logger';
import { DataRetentionService } from '../services/DataRetentionService';
import { ConfigService } from '../services/ConfigService';

/**
 * Job for purging expired logs
 */
export class PurgeJob {
  private cronJob: cron.ScheduledTask;

  /**
   * Constructor
   *
   * @param dataRetentionService Service for data retention
   * @param configService Configuration service
   */
  constructor(
    private dataRetentionService: DataRetentionService,
    private configService: ConfigService
  ) {
    // Get the cron schedule from config (default: run hourly at minute 0)
    const cronSchedule = this.configService.getPurgeCronSchedule();

    // Create the cron job
    this.cronJob = cron.schedule(cronSchedule, this.runPurgeJob.bind(this), {
      scheduled: false
    });

    logger.info(`Purge job initialized with schedule: ${cronSchedule}`);
  }

  /**
   * Start the purge job
   */
  public start(): void {
    this.cronJob.start();
    logger.info('Purge job started');
  }

  /**
   * Stop the purge job
   */
  public stop(): void {
    this.cronJob.stop();
    logger.info('Purge job stopped');
  }

  /**
   * Run the purge job manually
   */
  public async runPurgeJob(): Promise<void> {
    logger.info('Starting purge job');

    try {
      // Get the batch size from config
      const batchSize = this.configService.getPurgeBatchSize();

      // Run the purge process for all tenants
      const result = await this.dataRetentionService.purgeAllTenants(batchSize);

      if (result.success) {
        logger.info(`Purge job completed successfully. Purged ${result.totalPurged} log entries.`);
      } else {
        logger.error(`Purge job failed: ${result.error}`);
      }
    } catch (error) {
      logger.error('Error running purge job:', error);
    }
  }
}
