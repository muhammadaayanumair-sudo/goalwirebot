import { Collection } from 'discord.js';

export class CooldownManager {
  private cooldowns: Collection<string, Collection<string, number>> = new Collection();
  private premiumUsers: Set<string> = new Set();
  private partnerUsers: Set<string> = new Set();
  private devUsers: Set<string> = new Set([
    'YOUR_DEV_USER_ID',
  ]);

  public check(userId: string, command: string, seconds: number): number {
    const timestamps = this.cooldowns.get(command) || new Collection();
    const now = Date.now();
    const cooldownAmount = seconds * 1000;

    if (timestamps.has(userId)) {
      const expiration = timestamps.get(userId)! + cooldownAmount;
      if (now < expiration) {
        return Math.ceil((expiration - now) / 1000);
      }
    }

    timestamps.set(userId, now);
    this.cooldowns.set(command, timestamps);
    return 0;
  }

  public checkGlobal(userId: string, seconds: number): number {
    return this.check(userId, '__global__', seconds);
  }

  public clear(userId: string, command?: string): void {
    if (command) {
      this.cooldowns.get(command)?.delete(userId);
    } else {
      for (const [, timestamps] of this.cooldowns) {
        timestamps.delete(userId);
      }
    }
  }

  public setPremium(userId: string): void {
    this.premiumUsers.add(userId);
  }

  public removePremium(userId: string): void {
    this.premiumUsers.delete(userId);
  }

  public isPremium(userId: string): boolean {
    return this.premiumUsers.has(userId);
  }

  public setPartner(userId: string): void {
    this.partnerUsers.add(userId);
  }

  public removePartner(userId: string): void {
    this.partnerUsers.delete(userId);
  }

  public isPartner(userId: string): boolean {
    return this.partnerUsers.has(userId);
  }

  public isDev(userId: string): boolean {
    return this.devUsers.has(userId);
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [command, timestamps] of this.cooldowns) {
      for (const [userId, timestamp] of timestamps) {
        if (now > timestamp) {
          timestamps.delete(userId);
        }
      }
      if (timestamps.size === 0) {
        this.cooldowns.delete(command);
      }
    }
  }
}
