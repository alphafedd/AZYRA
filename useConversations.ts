import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  timestamp?: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const convs: Conversation[] = (data || []).map(c => ({
        id: c.id,
        title: c.title,
        messages: [],
        createdAt: new Date(c.created_at)
      }));

      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const msgs: Message[] = (data || []).map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at)
      }));

      setMessages(msgs);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [user]);

  // Create new conversation
  const createConversation = useCallback(async (title: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single();

      if (error) throw error;

      const newConv: Conversation = {
        id: data.id,
        title: data.title,
        messages: [],
        createdAt: new Date(data.created_at)
      };

      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user]);

  // Add message to database only (no state update to avoid duplicates)
  const addMessage = useCallback(async (
    conversationId: string, 
    role: "user" | "assistant", 
    content: string
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ 
          conversation_id: conversationId, 
          role, 
          content 
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data.id;
    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  }, [user]);

  // Update message content (for streaming)
  const updateMessageContent = useCallback((messageId: string, content: string) => {
    setMessages(prev => 
      prev.map(m => m.id === messageId ? { ...m, content } : m)
    );
  }, []);

  // Update message in database
  const saveMessageContent = useCallback(async (messageId: string, content: string) => {
    try {
      await supabase
        .from('messages')
        .update({ content })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversationId === conversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }, [user, currentConversationId]);

  // Start new chat
  const startNewChat = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
  }, []);

  // Add temporary message (for streaming before saving)
  const addTempMessage = useCallback((role: "user" | "assistant", content: string, id?: string): Message => {
    const newMessage: Message = {
      id: id || Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Update last message
  const updateLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      const lastIndex = prev.length - 1;
      if (lastIndex >= 0) {
        const updated = [...prev];
        updated[lastIndex] = { ...updated[lastIndex], content };
        return updated;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    currentConversationId,
    messages,
    loading,
    setMessages,
    loadConversations,
    loadMessages,
    createConversation,
    addMessage,
    updateMessageContent,
    saveMessageContent,
    deleteConversation,
    startNewChat,
    addTempMessage,
    updateLastMessage,
    setCurrentConversationId
  };
};
