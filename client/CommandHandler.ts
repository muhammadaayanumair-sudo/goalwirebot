import { readdirSync } from 'fs';
import { join } from 'path';
import { Collection, REST, Routes, type SlashCommandBuilder, type SlashCommandSubcommandsOnlyBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js';
import { GoalXClient } from './GoalXClient';
import { Env } from '../config/env';
import { logger } from '../utils/logger';
import { Colors } from '../config/colors';
import { BOT_NAME } from '../config/constants';
import { createErrorEmbed } from '../utils/embeds';

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  cooldown?: number;
  category?: string;
  permissions?: string[];
  premium?: boolean;
  partner?: boolean;
  devOnly?: boolean;
}

export class CommandHandler {
  public commands: Collection<string, Command> = new Collection();
  private client: GoalXClient;
  private categories: Set<string> = new Set();
  private loadedCount: number = 0;

  constructor(client: GoalXClient) {
    this.client = client;
  }

  public async loadCommands(): Promise<void> {
    try {
      const commandsPath = join(__dirname, '..', 'commands');
      const categories = readdirSync(commandsPath).filter(f => !f.startsWith('.'));

      for (const category of categories) {
        const categoryPath = join(commandsPath, category);
        const stat = readdirSync(categoryPath);

        for (const file of stat) {
          if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;

          try {
            const commandModule = await import(join(categoryPath, file));
            const command: Command = commandModule.default || commandModule;

            if (!command.data || !command.execute) {
              logger.warn(`[CMD] Skipping invalid command: ${category}/${file}`);
              continue;
            }

            const commandName = command.data.name;
            command.category = category;

            this.commands.set(commandName, command);
            this.categories.add(category);
            this.loadedCount++;

            logger.debug(`[CMD] Loaded: ${category}/${commandName}`);
          } catch (error) {
            logger.error(`[CMD] Failed to load ${category}/${file}`, error);
          }
        }
      }

      logger.info(`[CMDS] Loaded ${this.loadedCount} commands across ${this.categories.size} categories`);
    } catch (error) {
      logger.error('[CMDS] Failed to load commands directory', error);
    }
  }

  public async deploy(): Promise<void> {
    try {
      const commandData = this.commands.map(cmd => cmd.data.toJSON());

      if (!commandData.length) {
        logger.warn('[CMDS] No commands to deploy');
        return;
      }

      const rest = new REST({ version: '10' }).setToken(Env.DISCORD_TOKEN);

      if (Env.GUILD_ID) {
        await rest.put(
          Routes.applicationGuildCommands(Env.CLIENT_ID, Env.GUILD_ID),
          { body: commandData },
        );
        logger.info(`[CMDS] Deployed ${commandData.length} commands to guild ${Env.GUILD_ID}`);
      } else {
        await rest.put(
          Routes.applicationCommands(Env.CLIENT_ID),
          { body: commandData },
        );
        logger.info(`[CMDS] Deployed ${commandData.length} global commands`);
      }
    } catch (error) {
      logger.error('[CMDS] Failed to deploy commands', error);
    }
  }

  public async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (command.cooldown) {
        const remaining = this.client.cooldowns.check(interaction.user.id, interaction.commandName, command.cooldown);
        if (remaining > 0) {
          await interaction.reply({
            embeds: [createErrorEmbed(
              'Cooldown',
              `Please wait **${remaining}s** before using this command again.`,
            ).setFooter({ text: `You can use ${command.cooldown}s cooldown commands again in ${remaining}s` })],
            ephemeral: true,
          });
          return;
        }
      }

      if (command.premium && !this.client.cooldowns.isPremium(interaction.user.id)) {
        await interaction.reply({
          embeds: [createErrorEmbed(
            'Premium Required',
            'This command requires an active GoalX Premium subscription.',
          )],
          ephemeral: true,
        });
        return;
      }

      if (command.partner && !this.client.cooldowns.isPartner(interaction.user.id)) {
        await interaction.reply({
          embeds: [createErrorEmbed(
            'Partner Feature',
            'This command is exclusive to GoalX Partners. Become a partner to unlock early access.',
          )],
          ephemeral: true,
        });
        return;
      }

      if (command.devOnly && !this.client.cooldowns.isDev(interaction.user.id)) {
        await interaction.reply({
          embeds: [createErrorEmbed(
            'Developer Only',
            'This command is restricted to bot developers.',
          )],
          ephemeral: true,
        });
        return;
      }

      await command.execute(interaction);
    } catch (error) {
      logger.error(`[CMD] Error executing /${interaction.commandName}`, error);

      const errorEmbed = createErrorEmbed(
        'Command Error',
        'An unexpected error occurred while executing this command. Our team has been notified.',
      ).setDescription(`\`\`\`${(error as Error).message.slice(0, 500)}\`\`\``);

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }

  public async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      logger.error(`[CMD] Autocomplete error: /${interaction.commandName}`, error);
    }
  }

  public getCommandsByCategory(category: string): Command[] {
    return Array.from(this.commands.values()).filter(cmd => cmd.category === category);
  }

  public getCategories(): string[] {
    return Array.from(this.categories);
  }
}
