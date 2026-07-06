import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  recipientId?: string;
  recipientName?: string;
  content: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  isRead: boolean;
  isDeleted: boolean;
  parentMessageId?: string;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: Array<{
    userId: string;
    userName: string;
    userRole?: string;
    joinedAt: string;
  }>;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`
};

export const messagingService = {
  // Get all conversations for a user
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const response = await fetch(`${API_BASE}/messaging/conversations/${userId}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return await response.json();
    } catch (error) {
      // Silently return empty array - service may not be deployed
      return [];
    }
  },

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const response = await fetch(`${API_BASE}/messaging/conversations/${conversationId}/messages`, { headers });
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      return data.filter((m: Message) => !m.isDeleted);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  // Create a new conversation
  async createConversation(data: Partial<Conversation>): Promise<Conversation | null> {
    try {
      const response = await fetch(`${API_BASE}/messaging/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      return await response.json();
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  },

  // Find or create direct conversation
  async findOrCreateDirectConversation(
    user1Id: string,
    user1Name: string,
    user2Id: string,
    user2Name: string
  ): Promise<Conversation | null> {
    try {
      const response = await fetch(`${API_BASE}/messaging/conversations/direct`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user1Id, user1Name, user2Id, user2Name })
      });
      if (!response.ok) throw new Error('Failed to find/create conversation');
      return await response.json();
    } catch (error) {
      console.error('Error finding/creating conversation:', error);
      return null;
    }
  },

  // Send a message
  async sendMessage(data: Partial<Message>): Promise<Message | null> {
    try {
      const response = await fetch(`${API_BASE}/messaging/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to send message');
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  },

  // Mark messages as read
  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/messaging/conversations/${conversationId}/read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId })
      });
      return response.ok;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  },

  // Delete a message
  async deleteMessage(conversationId: string, messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/messaging/messages/${conversationId}/${messageId}`, {
        method: 'DELETE',
        headers
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const response = await fetch(`${API_BASE}/messaging/unread/${userId}`, { headers });
      if (!response.ok) throw new Error('Failed to get unread count');
      const data = await response.json();
      return data.count;
    } catch (error) {
      // Silently return 0 - service may not be deployed
      return 0;
    }
  },

  // Search messages
  async searchMessages(userId: string, query: string): Promise<Message[]> {
    try {
      const response = await fetch(`${API_BASE}/messaging/search/${userId}?q=${encodeURIComponent(query)}`, { headers });
      if (!response.ok) throw new Error('Failed to search messages');
      return await response.json();
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }
};