import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embeds';
import { Colors } from '../../config/colors';
import { EMOJIS, BOT_NAME } from '../../config/constants';

export class NotificationService {
  private static client: Client;

  static initialize(client: Client): void {
    this.client = client;
    logger.info('[NOTIFICATION] Service initialized');
  }

  static async sendToChannel(channelId: string, embed: EmbedBuilder): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      logger.error(`[NOTIFICATION] Failed to send to channel ${channelId}`, error);
    }
  }

  static async sendToUser(userId: string, embed: EmbedBuilder): Promise<void> {
    try {
      const user = await this.client.users.fetch(userId);
      await user.send({ embeds: [embed] });
    } catch (error) {
      logger.error(`[NOTIFICATION] Failed to send DM to ${userId}`, error);
    }
  }

  static async liveMatchAlert(match: any): Promise<void> {
    const embed = createEmbed(
      `${EMOJIS.LIVE} Match Alert: ${match.homeTeam} vs ${match.awayTeam}`,
      `Score: ${match.homeScore} — ${match.awayScore} | ${match.elapsed}'`,
    ).setColor(Colors.ERROR);
    // Broadcast to all subscribed channels
  }

  static async fantasyReminder(userId: string, type: string): Promise<void> {
    const messages: Record<string, string> = {
      deadline: 'Reminder: Gameweek deadline is approaching! Set your lineup.',
      transfer: 'You have free transfers available this gameweek.',
      captain: 'Don\'t forget to set your captain for the upcoming gameweek.',
    };
    const embed = createEmbed(
      `${EMOJIS.CALENDAR} Fantasy Reminder`,
      messages[type] || 'Fantasy reminder.',
    ).setColor(Colors.INFO);
    await this.sendToUser(userId, embed);
  }

  static async matchResult(result: any): Promise<void> {
    const embed = createEmbed(
      `${EMOJIS.GOAL} FT: ${result.homeTeam} ${result.homeScore} — ${result.awayScore} ${result.awayTeam}`,
      result.league,
    ).setColor(Colors.SUCCESS);
  }

  static async breakingNews(article: any): Promise<void> {
    const embed = createEmbed(
      `${EMOJIS.NEWS} Breaking News`,
      `[${article.title}](${article.url})`,
    ).setColor(Colors.ERROR);
  }

  static async partnerAnnouncement(userId: string, message: string): Promise<void> {
    const embed = createEmbed(
      `${EMOJIS.CROWN} Partner Update`,
      message,
    ).setColor(Colors.GOLD);
    await this.sendToUser(userId, embed);
  }
}

export default NotificationService;
