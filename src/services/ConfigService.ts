import logger from '../utils/logger';

/**
 * Service for accessing configuration values
 */
export class ConfigService {
  /**
   * Constructor
   */
  constructor() {
    // Initialize with environment variables
    logger.info('Initializing ConfigService');

    // Log the maximum retention period
    logger.info(`Maximum retention period: ${this.getMaxRetentionPeriodMs()} ms`);
  }

  /**
   * Get the maximum allowed retention period in milliseconds
   *
   * @returns Maximum retention period in milliseconds, or -1 for unlimited
   */
  public getMaxRetentionPeriodMs(): number {
    const maxRetentionPeriodMs = process.env.MAX_RETENTION_PERIOD_MS;

    if (maxRetentionPeriodMs === undefined) {
      // Default to 1 year if not specified
      return 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    }

    if (maxRetentionPeriodMs === '-1') {
      // Special value for unlimited retention
      return -1;
    }

    const parsed = parseInt(maxRetentionPeriodMs);
    if (isNaN(parsed) || parsed < -1) {
      logger.warn(`Invalid MAX_RETENTION_PERIOD_MS value: ${maxRetentionPeriodMs}, using default`);
      return 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    }

    return parsed;
  }

  /**
   * Get the purge job cron schedule
   *
   * @returns Cron schedule for the purge job
   */
  public getPurgeCronSchedule(): string {
    return process.env.PURGE_CRON_SCHEDULE || '0 * * * *'; // Default: run hourly at minute 0
  }

  /**
   * Get the purge batch size
   *
   * @returns Batch size for purging expired logs
   */
  public getPurgeBatchSize(): number {
    const batchSize = process.env.PURGE_BATCH_SIZE;

    if (batchSize === undefined) {
      return 1000; // Default batch size
    }

    const parsed = parseInt(batchSize);
    if (isNaN(parsed) || parsed <= 0) {
      logger.warn(`Invalid PURGE_BATCH_SIZE value: ${batchSize}, using default`);
      return 1000;
    }

    return parsed;
  }
}

export { ConfigService };
