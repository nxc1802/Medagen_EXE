/**
 * WebSocket Connection Manager
 * Manages session-based WebSocket connections for ReAct flow streaming
 */

import { WebSocket } from 'ws';
import { logger } from '../utils/logger.js';
import type { WebSocketMessage } from '../types/websocket.js';

export class WebSocketConnectionManager {
  // Map of session_id -> WebSocket connection
  private connections: Map<string, WebSocket> = new Map();

  // Map of session_id -> last activity timestamp
  private lastActivity: Map<string, number> = new Map();

  // Map of session_id -> message count (for rate limiting)
  private messageCount: Map<string, number> = new Map();

  // Cleanup interval (check every 1 minute)
  private cleanupInterval: NodeJS.Timeout;

  // Configuration
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly RATE_LIMIT = 100; // messages per minute
  // Rate limit window can be used for future rate limiting implementation
  // private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

  constructor() {
    // Start cleanup task
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 60 * 1000); // Run every minute

    logger.info('WebSocketConnectionManager initialized');
  }

  /**
   * Add a new connection for a session
   */
  addConnection(sessionId: string, ws: WebSocket): void {
    // Close existing connection if any
    if (this.connections.has(sessionId)) {
      logger.warn(`Replacing existing connection for session: ${sessionId}`);
      this.removeConnection(sessionId);
    }

    this.connections.set(sessionId, ws);
    this.lastActivity.set(sessionId, Date.now());
    this.messageCount.set(sessionId, 0);

    logger.info(`WebSocket connected for session: ${sessionId}`);

    // Setup connection handlers
    ws.on('close', () => {
      this.removeConnection(sessionId);
    });

    ws.on('error', (error) => {
      logger.error({ error, sessionId }, 'WebSocket error');
      this.removeConnection(sessionId);
    });
  }

  /**
   * Remove a connection
   */
  removeConnection(sessionId: string): void {
    const ws = this.connections.get(sessionId);
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch (error) {
        logger.error({ error, sessionId }, 'Error closing WebSocket');
      }
    }

    this.connections.delete(sessionId);
    this.lastActivity.delete(sessionId);
    this.messageCount.delete(sessionId);

    logger.info(`WebSocket disconnected for session: ${sessionId}`);
  }

  /**
   * Send a message to a specific session
   */
  async sendToSession(sessionId: string, message: WebSocketMessage): Promise<boolean> {
    const ws = this.connections.get(sessionId);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Cannot send message to session ${sessionId}: connection not open`);
      return false;
    }

    // Check rate limit
    if (!this.checkRateLimit(sessionId)) {
      logger.warn(`Rate limit exceeded for session: ${sessionId}`);
      this.sendError(sessionId, 'RATE_LIMIT', 'Rate limit exceeded (100 messages/minute)');
      return false;
    }

    try {
      // Add timestamp if not present
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }

      ws.send(JSON.stringify(message));

      // Update activity
      this.lastActivity.set(sessionId, Date.now());

      // Increment message count
      const count = this.messageCount.get(sessionId) || 0;
      this.messageCount.set(sessionId, count + 1);

      logger.debug({ sessionId, messageType: message.type }, 'Message sent to session');

      return true;
    } catch (error) {
      logger.error({ error, sessionId }, 'Error sending message');
      return false;
    }
  }

  /**
   * Send error message to a session
   */
  sendError(sessionId: string, code: string, message: string): void {
    this.sendToSession(sessionId, {
      type: 'error',
      code,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if session has active connection
   */
  hasConnection(sessionId: string): boolean {
    const ws = this.connections.get(sessionId);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Check rate limit for a session
   */
  private checkRateLimit(sessionId: string): boolean {
    const count = this.messageCount.get(sessionId) || 0;
    return count < this.RATE_LIMIT;
  }

  /**
   * Reset rate limit counters (called every minute)
   */
  private resetRateLimits(): void {
    this.messageCount.clear();
  }

  /**
   * Cleanup inactive connections
   */
  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const inactiveSessions: string[] = [];

    for (const [sessionId, lastTime] of this.lastActivity.entries()) {
      if (now - lastTime > this.INACTIVITY_TIMEOUT) {
        inactiveSessions.push(sessionId);
      }
    }

    if (inactiveSessions.length > 0) {
      logger.info(`Cleaning up ${inactiveSessions.length} inactive connections`);

      for (const sessionId of inactiveSessions) {
        this.removeConnection(sessionId);
      }
    }

    // Also reset rate limits every cleanup cycle
    this.resetRateLimits();
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);

    // Close all connections
    for (const sessionId of this.connections.keys()) {
      this.removeConnection(sessionId);
    }

    logger.info('WebSocketConnectionManager destroyed');
  }
}

// Singleton instance
export const wsConnectionManager = new WebSocketConnectionManager();
