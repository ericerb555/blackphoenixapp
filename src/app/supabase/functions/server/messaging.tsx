import * as kv from "./kv_store.tsx";

// Message types and interfaces
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

// Get all conversations for a user
export async function getConversationsForUser(userId: string): Promise<Conversation[]> {
  try {
    const allConversations = await kv.getByPrefix("conversation:");
    return allConversations.filter((conv: Conversation) => 
      conv.participants.some(p => p.userId === userId)
    );
  } catch (error) {
    // Silently return empty array - service may not be deployed
    return [];
  }
}

// Get messages for a conversation
export async function getMessagesForConversation(conversationId: string): Promise<Message[]> {
  try {
    const messages = await kv.getByPrefix(`message:${conversationId}:`);
    return messages.sort((a: Message, b: Message) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}

// Create a new conversation
export async function createConversation(data: Partial<Conversation>): Promise<Conversation> {
  try {
    const id = `CONV-${Date.now()}`;
    const conversation: Conversation = {
      ...data as Conversation,
      id,
      unreadCount: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`conversation:${id}`, conversation);
    console.log(`Created conversation: ${id}`);
    return conversation;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
}

// Find or create direct conversation between two users
export async function findOrCreateDirectConversation(
  user1Id: string,
  user1Name: string,
  user2Id: string,
  user2Name: string
): Promise<Conversation> {
  try {
    // Check if conversation already exists
    const allConversations = await kv.getByPrefix("conversation:");
    const existing = allConversations.find((conv: Conversation) => 
      conv.type === 'direct' && 
      conv.participants.length === 2 &&
      conv.participants.some(p => p.userId === user1Id) &&
      conv.participants.some(p => p.userId === user2Id)
    );
    
    if (existing) {
      return existing;
    }
    
    // Create new conversation
    return await createConversation({
      type: 'direct',
      participants: [
        { userId: user1Id, userName: user1Name, joinedAt: new Date().toISOString() },
        { userId: user2Id, userName: user2Name, joinedAt: new Date().toISOString() }
      ]
    });
  } catch (error) {
    console.error("Error finding/creating conversation:", error);
    throw error;
  }
}

// Send a message
export async function sendMessage(data: Partial<Message>): Promise<Message> {
  try {
    const id = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message: Message = {
      ...data as Message,
      id,
      isRead: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`message:${data.conversationId}:${id}`, message);
    
    // Update conversation's last message
    const conversation = await kv.get(`conversation:${data.conversationId}`) as Conversation;
    if (conversation) {
      const updatedConversation: Conversation = {
        ...conversation,
        lastMessage: data.content?.substring(0, 100) || '',
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Increment unread count for all participants except sender
      conversation.participants.forEach(p => {
        if (p.userId !== data.senderId) {
          if (!updatedConversation.unreadCount) {
            updatedConversation.unreadCount = {};
          }
          updatedConversation.unreadCount[p.userId] = (updatedConversation.unreadCount[p.userId] || 0) + 1;
        }
      });
      
      await kv.set(`conversation:${data.conversationId}`, updatedConversation);
    }
    
    console.log(`Sent message: ${id} in conversation ${data.conversationId}`);
    return message;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

// Mark messages as read
export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const messages = await getMessagesForConversation(conversationId);
    const unreadMessages = messages.filter(m => 
      m.recipientId === userId && !m.isRead
    );
    
    for (const message of unreadMessages) {
      const updated: Message = {
        ...message,
        isRead: true,
        readAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await kv.set(`message:${conversationId}:${message.id}`, updated);
    }
    
    // Reset unread count for this user
    const conversation = await kv.get(`conversation:${conversationId}`) as Conversation;
    if (conversation && conversation.unreadCount) {
      conversation.unreadCount[userId] = 0;
      await kv.set(`conversation:${conversationId}`, conversation);
    }
    
    console.log(`Marked ${unreadMessages.length} messages as read for user ${userId}`);
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
}

// Delete a message
export async function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  try {
    const message = await kv.get(`message:${conversationId}:${messageId}`) as Message;
    if (message) {
      const updated: Message = {
        ...message,
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      };
      await kv.set(`message:${conversationId}:${messageId}`, updated);
      console.log(`Deleted message: ${messageId}`);
    }
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
}

// Get unread count for a user
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const conversations = await getConversationsForUser(userId);
    let total = 0;
    conversations.forEach(conv => {
      if (conv.unreadCount && conv.unreadCount[userId]) {
        total += conv.unreadCount[userId];
      }
    });
    return total;
  } catch (error) {
    // Silently return 0 - service may not be deployed
    return 0;
  }
}

// Search messages
export async function searchMessages(userId: string, query: string): Promise<Message[]> {
  try {
    const conversations = await getConversationsForUser(userId);
    const allMessages: Message[] = [];
    
    for (const conv of conversations) {
      const messages = await getMessagesForConversation(conv.id);
      allMessages.push(...messages.filter(m => 
        !m.isDeleted && 
        m.content.toLowerCase().includes(query.toLowerCase())
      ));
    }
    
    return allMessages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error searching messages:", error);
    return [];
  }
}