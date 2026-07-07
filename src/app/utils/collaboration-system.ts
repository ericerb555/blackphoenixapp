/**
 * Real-Time Collaboration System
 * WebSocket-based live updates, cursor presence, version control
 */

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  isActive: boolean;
  lastSeen: number;
  tool: string | null;
}

export interface CollaborationEvent {
  type: 'cursor' | 'element-add' | 'element-update' | 'element-delete' | 'user-join' | 'user-leave';
  userId: string;
  timestamp: number;
  data: any;
}

export interface VersionEntry {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: string;
  snapshot: any; // Complete state snapshot
  diff?: any; // Optional diff from previous version
}

/**
 * Collaboration Manager
 */
export class CollaborationManager {
  private ws: WebSocket | null = null;
  private users: Map<string, CollaborationUser> = new Map();
  private currentUserId: string;
  private currentUserName: string;
  private projectId: string;
  private onEventCallback?: (event: CollaborationEvent) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(projectId: string, userId: string, userName: string) {
    this.projectId = projectId;
    this.currentUserId = userId;
    this.currentUserName = userName;
  }

  /**
   * Connect to collaboration server
   */
  connect(wsUrl: string, onEvent: (event: CollaborationEvent) => void): Promise<void> {
    this.onEventCallback = onEvent;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔗 Collaboration connected');
          this.reconnectAttempts = 0;

          // Send join event
          this.send({
            type: 'user-join',
            userId: this.currentUserId,
            timestamp: Date.now(),
            data: {
              name: this.currentUserName,
              projectId: this.projectId,
            },
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 Collaboration disconnected');
          this.attemptReconnect(wsUrl);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from collaboration server
   */
  disconnect(): void {
    if (this.ws) {
      // Send leave event
      this.send({
        type: 'user-leave',
        userId: this.currentUserId,
        timestamp: Date.now(),
        data: {},
      });

      this.ws.close();
      this.ws = null;
    }
    this.users.clear();
  }

  /**
   * Send cursor position update
   */
  updateCursor(x: number, y: number): void {
    this.send({
      type: 'cursor',
      userId: this.currentUserId,
      timestamp: Date.now(),
      data: { x, y },
    });
  }

  /**
   * Broadcast element addition
   */
  broadcastElementAdd(element: any): void {
    this.send({
      type: 'element-add',
      userId: this.currentUserId,
      timestamp: Date.now(),
      data: { element },
    });
  }

  /**
   * Broadcast element update
   */
  broadcastElementUpdate(elementId: string, updates: any): void {
    this.send({
      type: 'element-update',
      userId: this.currentUserId,
      timestamp: Date.now(),
      data: { elementId, updates },
    });
  }

  /**
   * Broadcast element deletion
   */
  broadcastElementDelete(elementId: string): void {
    this.send({
      type: 'element-delete',
      userId: this.currentUserId,
      timestamp: Date.now(),
      data: { elementId },
    });
  }

  /**
   * Get all active users
   */
  getActiveUsers(): CollaborationUser[] {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    return Array.from(this.users.values()).filter((user) => {
      const isRecent = now - user.lastSeen < timeout;
      return isRecent && user.isActive;
    });
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): CollaborationUser | undefined {
    return this.users.get(userId);
  }

  // Private methods
  private send(event: CollaborationEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  private handleMessage(message: CollaborationEvent): void {
    // Update user data
    if (message.userId !== this.currentUserId) {
      this.updateUserActivity(message);
    }

    // Call event callback
    if (this.onEventCallback) {
      this.onEventCallback(message);
    }
  }

  private updateUserActivity(event: CollaborationEvent): void {
    const userId = event.userId;
    let user = this.users.get(userId);

    if (!user) {
      // Create new user
      user = {
        id: userId,
        name: event.data.name || `User ${userId.slice(0, 6)}`,
        color: this.generateUserColor(userId),
        cursor: null,
        isActive: true,
        lastSeen: event.timestamp,
        tool: null,
      };
      this.users.set(userId, user);
    }

    // Update user state
    user.lastSeen = event.timestamp;
    user.isActive = event.type !== 'user-leave';

    if (event.type === 'cursor' && event.data) {
      user.cursor = { x: event.data.x, y: event.data.y };
    }

    if (event.data.tool) {
      user.tool = event.data.tool;
    }
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  private attemptReconnect(wsUrl: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

      setTimeout(() => {
        if (this.onEventCallback) {
          this.connect(wsUrl, this.onEventCallback).catch((error) => {
            console.error('Reconnect failed:', error);
          });
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnect attempts reached');
    }
  }
}

/**
 * Version Control Manager
 */
export class VersionControlManager {
  private versions: VersionEntry[] = [];
  private maxVersions = 100; // Keep last 100 versions
  private currentVersionIndex = -1;

  /**
   * Create a new version
   */
  createVersion(
    userId: string,
    userName: string,
    action: string,
    snapshot: any
  ): VersionEntry {
    const version: VersionEntry = {
      id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userId,
      userName,
      action,
      snapshot: JSON.parse(JSON.stringify(snapshot)), // Deep clone
    };

    // Remove any versions after current index (if we're not at the end)
    if (this.currentVersionIndex < this.versions.length - 1) {
      this.versions = this.versions.slice(0, this.currentVersionIndex + 1);
    }

    // Add new version
    this.versions.push(version);
    this.currentVersionIndex = this.versions.length - 1;

    // Trim old versions
    if (this.versions.length > this.maxVersions) {
      const removeCount = this.versions.length - this.maxVersions;
      this.versions = this.versions.slice(removeCount);
      this.currentVersionIndex -= removeCount;
    }

    return version;
  }

  /**
   * Undo to previous version
   */
  undo(): VersionEntry | null {
    if (this.currentVersionIndex > 0) {
      this.currentVersionIndex--;
      return this.versions[this.currentVersionIndex];
    }
    return null;
  }

  /**
   * Redo to next version
   */
  redo(): VersionEntry | null {
    if (this.currentVersionIndex < this.versions.length - 1) {
      this.currentVersionIndex++;
      return this.versions[this.currentVersionIndex];
    }
    return null;
  }

  /**
   * Get version at specific index
   */
  getVersion(index: number): VersionEntry | null {
    if (index >= 0 && index < this.versions.length) {
      return this.versions[index];
    }
    return null;
  }

  /**
   * Get current version
   */
  getCurrentVersion(): VersionEntry | null {
    return this.getVersion(this.currentVersionIndex);
  }

  /**
   * Get all versions
   */
  getAllVersions(): VersionEntry[] {
    return [...this.versions];
  }

  /**
   * Get version history (last N versions)
   */
  getRecentVersions(count: number = 10): VersionEntry[] {
    const start = Math.max(0, this.versions.length - count);
    return this.versions.slice(start);
  }

  /**
   * Jump to specific version
   */
  jumpToVersion(versionId: string): VersionEntry | null {
    const index = this.versions.findIndex(v => v.id === versionId);
    if (index !== -1) {
      this.currentVersionIndex = index;
      return this.versions[index];
    }
    return null;
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.currentVersionIndex > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.currentVersionIndex < this.versions.length - 1;
  }

  /**
   * Clear all versions
   */
  clear(): void {
    this.versions = [];
    this.currentVersionIndex = -1;
  }

  /**
   * Export version history
   */
  exportHistory(): string {
    return JSON.stringify({
      versions: this.versions,
      currentIndex: this.currentVersionIndex,
    }, null, 2);
  }

  /**
   * Import version history
   */
  importHistory(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      this.versions = parsed.versions || [];
      this.currentVersionIndex = parsed.currentIndex || -1;
      return true;
    } catch (error) {
      console.error('Failed to import version history:', error);
      return false;
    }
  }
}

/**
 * Render collaboration cursors on canvas
 */
export function renderCollaborationCursors(
  users: CollaborationUser[],
  ctx: CanvasRenderingContext2D | SVGElement,
  zoom: number = 1
): void {
  users.forEach((user) => {
    if (!user.cursor || !user.isActive) return;

    if (ctx instanceof CanvasRenderingContext2D) {
      // Canvas rendering
      ctx.save();
      
      // Draw cursor
      ctx.fillStyle = user.color;
      ctx.beginPath();
      ctx.moveTo(user.cursor.x, user.cursor.y);
      ctx.lineTo(user.cursor.x + 12, user.cursor.y + 4);
      ctx.lineTo(user.cursor.x + 6, user.cursor.y + 10);
      ctx.closePath();
      ctx.fill();

      // Draw name label
      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = user.color;
      ctx.fillRect(user.cursor.x + 14, user.cursor.y - 4, ctx.measureText(user.name).width + 8, 18);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(user.name, user.cursor.x + 18, user.cursor.y + 8);

      ctx.restore();
    }
  });
}
