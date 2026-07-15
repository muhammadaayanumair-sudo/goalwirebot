import mongoose from 'mongoose';
import { Env } from '../config/env';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(Env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        w: 'majority',
      });

      mongoose.connection.on('connected', () => {
        logger.info('[MONGO] Database connected successfully');
      });

      mongoose.connection.on('error', (error) => {
        logger.error('[MONGO] Connection error', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('[MONGO] Database disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('[MONGO] Database reconnected');
      });

      return;
    } catch (error) {
      retries++;
      logger.error(`[MONGO] Connection attempt ${retries}/${maxRetries} failed`, error);
      if (retries >= maxRetries) {
        throw new Error('Failed to connect to MongoDB after multiple retries');
      }
      await new Promise(resolve => setTimeout(resolve, 3000 * retries));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('[MONGO] Database disconnected gracefully');
  } catch (error) {
    logger.error('[MONGO] Error disconnecting database', error);
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
