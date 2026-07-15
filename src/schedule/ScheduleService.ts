import cron from 'node-cron';
import { logger } from '../../utils/logger';

interface ScheduledTask {
  name: string;
  cronExpression: string;
  task: () => Promise<void>;
  running: boolean;
}

export class ScheduleService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  register(name: string, cronExpression: string, task: () => Promise<void>): void {
    this.tasks.set(name, { name, cronExpression, task, running: false });
    logger.debug(`Registered scheduled task: ${name} (${cronExpression})`);
  }

  startAll(): void {
    for (const [name] of this.tasks) {
      this.start(name);
    }
    logger.info(`Started ${this.tasks.size} scheduled tasks`);
  }

  start(name: string): void {
    const scheduled = this.tasks.get(name);
    if (!scheduled) { logger.warn(`Cannot start unknown task: ${name}`); return; }
    if (this.cronJobs.has(name)) { this.cronJobs.get(name)!.stop(); }
    const job = cron.schedule(scheduled.cronExpression, async () => {
      if (scheduled.running) return;
      scheduled.running = true;
      try {
        logger.debug(`Running scheduled task: ${name}`);
        await scheduled.task();
      } catch (error) {
        logger.error(`Scheduled task ${name} failed:`, error);
      } finally {
        scheduled.running = false;
      }
    });
    this.cronJobs.set(name, job);
    logger.info(`Scheduled task started: ${name}`);
  }

  stop(name: string): void {
    const job = this.cronJobs.get(name);
    if (job) { job.stop(); this.cronJobs.delete(name); }
  }

  stopAll(): void {
    for (const [name] of this.cronJobs) this.stop(name);
    logger.info('All scheduled tasks stopped');
  }
}
