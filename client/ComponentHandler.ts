import { readdirSync } from 'fs';
import { join } from 'path';
import { ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction, AnySelectMenuInteraction, Collection } from 'discord.js';
import { GoalXClient } from './GoalXClient';
import { logger } from '../utils/logger';
import { BOT_NAME } from '../config/constants';
import { createErrorEmbed } from '../utils/embeds';

type ComponentExecutor = (interaction: any) => Promise<void>;

interface ComponentRegistry {
  buttons: Collection<string, ComponentExecutor>;
  selectMenus: Collection<string, ComponentExecutor>;
  modals: Collection<string, ComponentExecutor>;
}

export class ComponentHandler {
  private client: GoalXClient;
  private registry: ComponentRegistry;
  private loadedCount: number = 0;

  constructor(client: GoalXClient) {
    this.client = client;
    this.registry = {
      buttons: new Collection(),
      selectMenus: new Collection(),
      modals: new Collection(),
    };
  }

  public async loadComponents(): Promise<void> {
    const componentsPath = join(__dirname, '..', 'components');
    const categories = ['buttons', 'selectMenus', 'modals'];

    for (const category of categories) {
      const categoryPath = join(componentsPath, category);
      try {
        const files = readdirSync(categoryPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

        for (const file of files) {
          try {
            const module = await import(join(categoryPath, file));
            const component = module.default || module;

            if (!component || !component.customId || !component.execute) continue;

            const target =
              category === 'buttons' ? this.registry.buttons :
              category === 'selectMenus' ? this.registry.selectMenus :
              this.registry.modals;

            const ids = Array.isArray(component.customId) ? component.customId : [component.customId];
            for (const id of ids) {
              target.set(id, component.execute);
            }

            this.loadedCount++;
            logger.debug(`[COMPONENT] Loaded: ${category}/${file} (${component.customId})`);
          } catch (error) {
            logger.error(`[COMPONENT] Failed to load ${category}/${file}`, error);
          }
        }
      } catch {
        logger.debug(`[COMPONENT] No ${category} directory found`);
      }
    }

    logger.info(`[COMPONENTS] Loaded ${this.loadedCount} component handlers`);
  }

  public async handleButton(interaction: ButtonInteraction): Promise<void> {
    const executor = this.findExecutor(interaction.customId, this.registry.buttons);
    if (!executor) return;
    await this.executeWithGuard(interaction, executor);
  }

  public async handleSelectMenu(interaction: AnySelectMenuInteraction): Promise<void> {
    const executor = this.findExecutor(interaction.customId, this.registry.selectMenus);
    if (!executor) return;
    await this.executeWithGuard(interaction, executor);
  }

  public async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const executor = this.findExecutor(interaction.customId, this.registry.modals);
    if (!executor) return;
    await this.executeWithGuard(interaction, executor);
  }

  private findExecutor(customId: string, collection: Collection<string, ComponentExecutor>): ComponentExecutor | undefined {
    const exact = collection.get(customId);
    if (exact) return exact;

    for (const [key, executor] of collection) {
      if (key.includes('*') && customId.startsWith(key.replace('*', ''))) {
        return executor;
      }
    }

    return undefined;
  }

  private async executeWithGuard(interaction: any, execute: ComponentExecutor): Promise<void> {
    try {
      await execute(interaction);
    } catch (error) {
      logger.error(`[COMPONENT] Error handling ${interaction.customId}`, error);

      const embed = createErrorEmbed('Component Error', 'Something went wrong processing your interaction.');
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }
}
