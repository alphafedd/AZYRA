import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MemoryItem {
  key: string;
  value: string;
}

export const useMemory = () => {
  const { user } = useAuth();
  const [memory, setMemory] = useState<MemoryItem[]>([]);

  // Load user memory
  const loadMemory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_memory')
        .select('key, value')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMemory(data || []);
    } catch (error) {
      console.error('Error loading memory:', error);
    }
  }, [user]);

  // Save memory item
  const saveMemory = useCallback(async (key: string, value: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_memory')
        .upsert({ 
          user_id: user.id, 
          key, 
          value,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id,key' 
        });

      if (error) throw error;
      
      setMemory(prev => {
        const existing = prev.findIndex(m => m.key === key);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { key, value };
          return updated;
        }
        return [{ key, value }, ...prev];
      });
    } catch (error) {
      console.error('Error saving memory:', error);
    }
  }, [user]);

  // Get memory context for AI
  const getMemoryContext = useCallback(() => {
    if (memory.length === 0) return '';
    
    const contextItems = memory.map(m => `- ${m.key}: ${m.value}`).join('\n');
    return `\n\nInformations mémorisées sur l'utilisateur:\n${contextItems}`;
  }, [memory]);

  // Extract and save important info from conversation
  const extractAndSaveMemory = useCallback(async (userMessage: string, assistantResponse: string) => {
    if (!user) return;

    // Simple extraction patterns
    const patterns = [
      { regex: /je m'appelle (\w+)/i, key: 'prénom' },
      { regex: /mon nom est (\w+)/i, key: 'prénom' },
      { regex: /j'ai (\d+) ans/i, key: 'âge' },
      { regex: /je suis (\w+)/i, key: 'profession', condition: (match: string) => 
        ['développeur', 'designer', 'étudiant', 'ingénieur', 'médecin', 'avocat', 'professeur'].includes(match.toLowerCase())
      },
      { regex: /j'habite (?:à|en|au) (.+?)(?:\.|,|$)/i, key: 'lieu' },
      { regex: /je vis (?:à|en|au) (.+?)(?:\.|,|$)/i, key: 'lieu' },
    ];

    for (const pattern of patterns) {
      const match = userMessage.match(pattern.regex);
      if (match && match[1]) {
        const value = match[1].trim();
        if (!pattern.condition || pattern.condition(value)) {
          await saveMemory(pattern.key, value);
        }
      }
    }
  }, [user, saveMemory]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  return {
    memory,
    loadMemory,
    saveMemory,
    getMemoryContext,
    extractAndSaveMemory
  };
};
