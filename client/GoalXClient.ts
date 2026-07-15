import { Client, Collection, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { Env } from '../config/env';
import { BOT_NAME, BOT_VERSION } from '../config/constants';
import { logger } from '../utils/logger';
import { CommandHandler } from './CommandHandler';
import { EventHandler } from './EventHandler';
import { ComponentHandler } from './ComponentHandler';
import { CooldownManager } from './CooldownManager';
import { connectDatabase } from '../database/mongo';
import type { Command } from '../types/discord';

export class GoalXClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public commandHandler: CommandHandler;
  public eventHandler: EventHandler;
  public componentHandler: ComponentHandler;
  public cooldowns: CooldownManager;
  public restApi: REST;
  public startupTime: number = Date.now();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
        Partials.ThreadMember,
      ],
      allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: true,
      },
      presence: {
        activities: [{
          name: `${BOT_NAME} v${BOT_VERSION} | /help`,
          type: 3,
        }],
        status: 'online',
      },
      failIfNotExists: false,
      retryLimit: 3,
    });

    this.restApi = new REST({ version: '10' }).setToken(Env.DISCORD_TOKEN);
    this.cooldowns = new CooldownManager();
    this.commandHandler = new CommandHandler(this);
    this.eventHandler = new EventHandler(this);
    this.componentHandler = new ComponentHandler(this);
  }

  public override async login(token?: string): Promise<string> {
    logger.info(`[${BOT_NAME}] Initializing components...`);

    this.eventHandler.register();
    await this.commandHandler.loadCommands();
    await this.componentHandler.loadComponents();
    this.setupPerformanceMonitoring();

    logger.info(`[${BOT_NAME}] Logging in to Discord gateway...`);
    return super.login(token || Env.DISCORD_TOKEN);
  }

  public async deployCommands(): Promise<void> {
    try {
      const commands = this.commands.map(cmd => cmd.data.toJSON());
      const target = Env.GUILD_ID
        ? Routes.applicationGuildCommands(Env.CLIENT_ID, Env.GUILD_ID)
        : Routes.applicationCommands(Env.CLIENT_ID);

      logger.info(`[${BOT_NAME}] Deploying ${commands.length} commands...`);
      await this.restApi.put(target, { body: commands });
      logger.info(`[${BOT_NAME}] Commands deployed successfully`);
    } catch (error) {
      logger.error(`[${BOT_NAME}] Failed to deploy commands`, error);
    }
  }

  public async cleanup(): Promise<void> {
    logger.info(`[${BOT_NAME}] Cleaning up resources...`);
    this.cooldowns.cleanup();
    this.commandHandler.commands.clear();
    this.removeAllListeners();
    this.destroy();
  }

  private setupPerformanceMonitoring(): void {
    const memoryInterval = setInterval(() => {
      const used = process.memoryUsage();
      logger.debug(`[${BOT_NAME}] Memory — RSS: ${(used.rss / 1024 / 1024).toFixed(1)}MB, Heap: ${(used.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    }, 300_000);

    memoryInterval.unref();
  }

  public getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startupTime) / 1000);
  }

  public getGuildCount(): number {
    return this.guilds.cache.size;
  }

  public getUserCount(): number {
    return this.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
  }
}
