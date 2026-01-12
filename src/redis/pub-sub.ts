import { createLogger } from '../utils/logger.js';

import { redisPubSub } from './client.js';

const logger = createLogger({ module: 'redis-pubsub' });

type MessageHandler = (channel: string, message: string) => void;

/**
 * Redis Pub/Sub manager
 */
class PubSubManager {
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private subscribed: Set<string> = new Set();
  private listening = false;

  constructor() {
    this.setupMessageListener();
  }

  /**
   * Setup message listener
   */
  private setupMessageListener() {
    if (this.listening) return;

    redisPubSub.on('message', (channel: string, message: string) => {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(channel, message);
          } catch (error) {
            logger.error('Error in message handler', {
              channel,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });
      }
    });

    this.listening = true;
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, handler: MessageHandler): Promise<void> {
    // Add handler
    let handlers = this.handlers.get(channel);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(channel, handlers);
    }
    handlers.add(handler);

    // Subscribe if not already subscribed
    if (!this.subscribed.has(channel)) {
      await redisPubSub.subscribe(channel);
      this.subscribed.add(channel);
      logger.info(`Subscribed to channel: ${channel}`);
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, handler?: MessageHandler): Promise<void> {
    if (handler) {
      // Remove specific handler
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(channel);
        }
      }
    } else {
      // Remove all handlers for channel
      this.handlers.delete(channel);
    }

    // Unsubscribe if no more handlers
    if (!this.handlers.has(channel) && this.subscribed.has(channel)) {
      await redisPubSub.unsubscribe(channel);
      this.subscribed.delete(channel);
      logger.info(`Unsubscribed from channel: ${channel}`);
    }
  }

  /**
   * Publish to a channel
   */
  async publish(channel: string, message: string | Record<string, unknown>): Promise<number> {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    const subscribers = await redisPubSub.publish(channel, messageStr);
    logger.debug(`Published to ${channel}`, { subscribers });
    return subscribers;
  }
}

export const pubSubManager = new PubSubManager();
