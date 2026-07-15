import { readdirSync } from 'fs';
import { join } from 'path';
import { GoalXClient } from './GoalXClient';
import { logger } from '../utils/logger';
import { BOT_NAME } from '../config/constants';

export class EventHandler {
  private client: GoalXClient;
  private loadedCount: number = 0;

  constructor(client: GoalXClient) {
    this.client = client;
  }

  public register(): void {
    try {
      const eventsPath = join(__dirname, '..', 'events');
      const eventFiles = readdirSync(eventsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

      for (const file of eventFiles) {
        try {
          const eventModule = require(join(eventsPath, file));
          const event = eventModule.default || eventModule;

          const eventName = file.replace('.ts', '').replace('.js', '');
          const once = event.once || false;

          if (once) {
            this.client.once(eventName, (...args: any[]) => event.execute(...args, this.client));
          } else {
            this.client.on(eventName, (...args: any[]) => event.execute(...args, this.client));
          }

          this.loadedCount++;
          logger.debug(`[EVENT] Registered: ${eventName}${once ? ' (once)' : ''}`);
        } catch (error) {
          logger.error(`[EVENT] Failed to register: ${file}`, error);
        }
      }

      logger.info(`[EVENTS] Registered ${this.loadedCount} event handlers`);
    } catch (error) {
      logger.error('[EVENTS] Failed to register event handlers', error);
    }
  }
}
