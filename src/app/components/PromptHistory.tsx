import React, { useState, useEffect } from 'react';
import { History, Search, Trash2, Star, Clock, TrendingUp } from 'lucide-react';

interface PromptItem {
  id: string;
  text: string;
  timestamp: Date;
  category: string;
  isFavorite: boolean;
  results?: number;
}

interface PromptHistoryProps {
  onSelectPrompt?: (prompt: string) => void;
  maxItems?: number;
}

export function PromptHistory({ onSelectPrompt, maxItems = 50 }: PromptHistoryProps) {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'recent'>('all');

  useEffect(() => {
    loadPromptHistory();
  }, []);

  const loadPromptHistory = () => {
    const saved = localStorage.getItem('prompt-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setPrompts(parsed);
      } catch (error) {
        console.error('Failed to load prompt history:', error);
      }
    }
  };

  const savePromptHistory = (newPrompts: PromptItem[]) => {
    localStorage.setItem('prompt-history', JSON.stringify(newPrompts));
    setPrompts(newPrompts);
  };

  const addPrompt = (text: string, category: string = 'general') => {
    const newPrompt: PromptItem = {
      id: Date.now().toString(),
      text,
      timestamp: new Date(),
      category,
      isFavorite: false,
      results: Math.floor(Math.random() * 100),
    };

    const updated = [newPrompt, ...prompts].slice(0, maxItems);
    savePromptHistory(updated);
  };

  const toggleFavorite = (id: string) => {
    const updated = prompts.map((p) =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    );
    savePromptHistory(updated);
  };

  const deletePrompt = (id: string) => {
    const updated = prompts.filter((p) => p.id !== id);
    savePromptHistory(updated);
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all prompt history?')) {
      savePromptHistory([]);
    }
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch = prompt.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'favorites' && prompt.isFavorite) ||
      (filter === 'recent' && Date.now() - prompt.timestamp.getTime() < 86400000);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-[#0A0A0A] rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#ea580c]" />
            <h3 className="text-lg font-semibold text-white">Prompt History</h3>
          </div>
          <button
            onClick={clearAll}
            className="p-2 hover:bg-zinc-900 rounded transition-colors"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#ea580c] text-white'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              filter === 'favorites'
                ? 'bg-[#ea580c] text-white'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <Star className="w-3 h-3" />
            Favorites
          </button>
          <button
            onClick={() => setFilter('recent')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              filter === 'recent'
                ? 'bg-[#ea580c] text-white'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-3 h-3" />
            Recent
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredPrompts.length === 0 ? (
          <div className="p-8 text-center">
            <History className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">
              {searchTerm ? 'No prompts found' : 'No prompt history yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="p-4 hover:bg-zinc-900/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleFavorite(prompt.id)}
                    className="mt-1 flex-shrink-0"
                  >
                    <Star
                      className={`w-4 h-4 transition-colors ${
                        prompt.isFavorite
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-zinc-600 group-hover:text-zinc-400'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => onSelectPrompt?.(prompt.text)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm text-white mb-1 line-clamp-2">{prompt.text}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(prompt.timestamp)}
                      </span>
                      {prompt.results !== undefined && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {prompt.results} results
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">
                        {prompt.category}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => deletePrompt(prompt.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-600 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {prompts.length > 0 && (
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {filteredPrompts.length} of {prompts.length} prompts
            </span>
            <span>Max: {maxItems}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Export utility function for external use
export function addToPromptHistory(text: string, category: string = 'general') {
  const saved = localStorage.getItem('prompt-history');
  let prompts: PromptItem[] = [];

  if (saved) {
    try {
      prompts = JSON.parse(saved);
    } catch (error) {
      console.error('Failed to parse prompt history:', error);
    }
  }

  const newPrompt: PromptItem = {
    id: Date.now().toString(),
    text,
    timestamp: new Date(),
    category,
    isFavorite: false,
  };

  const updated = [newPrompt, ...prompts].slice(0, 50);
  localStorage.setItem('prompt-history', JSON.stringify(updated));
}
