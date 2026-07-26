// Project Selector - Import Quote/Project to Design Studio
import { useState, useEffect } from 'react';
import { FolderOpen, Search, FileText, Calendar, User, DollarSign, Clock, Image, Video, FileEdit, ChevronRight } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Quote {
  id: string;
  quoteNumber: string;
  customerName: string;
  projectType: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  description?: string;
  hasPhotos?: boolean;
  hasVideos?: boolean;
  hasNotes?: boolean;
  workRequestId?: string;
}

interface ProjectSelectorProps {
  onClose: () => void;
  onSelectProject: (quote: Quote) => void;
}

export default function ProjectSelector({ onClose, onSelectProject }: ProjectSelectorProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [recentProjects, setRecentProjects] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'quotes' | 'recent'>('quotes');

  useEffect(() => {
    fetchQuotesAndProjects();
  }, []);

  const fetchQuotesAndProjects = async () => {
    try {
      setLoading(true);

      // Fetch active quotes
      const quotesResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/quotes/list`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (quotesResponse.ok) {
        const quotesData = await quotesResponse.json();
        setQuotes(quotesData.quotes || []);
      }

      // Fetch recent studio projects from KV store
      const recentResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/studio/recent-projects`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentProjects(recentData.projects || []);
      }

    } catch (error) {
      console.error('Error fetching quotes/projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.quoteNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.projectType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectQuote = async (quote: Quote) => {
    // Save to recent projects
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/studio/save-recent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            customerName: quote.customerName,
            lastOpened: new Date().toISOString()
          })
        }
      );
    } catch (error) {
      console.error('Error saving recent project:', error);
    }

    onSelectProject(quote);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-[#ea580c]" />
              Open Project
            </h2>
            <p className="text-sm text-gray-400">
              Select a quote or recent project to work on in Design Studio
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2A2A2A] bg-[#0A0A0A]">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'quotes'
                ? 'text-[#ea580c] border-b-2 border-[#ea580c]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Active Quotes ({quotes.length})
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'recent'
                ? 'text-[#ea580c] border-b-2 border-[#ea580c]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Recent Projects ({recentProjects.length})
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by quote number, customer, or project type..."
              className="w-full pl-10 pr-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading projects...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'quotes' && (
                <div className="space-y-3">
                  {filteredQuotes.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No quotes found</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {searchQuery ? 'Try a different search term' : 'Create a new quote to get started'}
                      </p>
                    </div>
                  ) : (
                    filteredQuotes.map((quote) => (
                      <QuoteCard
                        key={quote.id}
                        quote={quote}
                        onSelect={() => handleSelectQuote(quote)}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'recent' && (
                <div className="space-y-3">
                  {recentProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No recent projects</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Projects you work on will appear here
                      </p>
                    </div>
                  ) : (
                    recentProjects.map((quote) => (
                      <QuoteCard
                        key={quote.id}
                        quote={quote}
                        onSelect={() => handleSelectQuote(quote)}
                        isRecent
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2A2A2A] p-4 bg-[#0A0A0A]">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <p>Select a project to open in Design Studio Pro</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteCard({ quote, onSelect, isRecent = false }: { quote: Quote; onSelect: () => void; isRecent?: boolean }) {
  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400'
  };

  return (
    <button
      onClick={onSelect}
      className="w-full p-4 bg-[#2A2A2A] border-2 border-[#3A3A3A] rounded-lg hover:border-[#ea580c] transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-white group-hover:text-[#ea580c] transition-colors">
              {quote.quoteNumber || 'Untitled Quote'}
            </h3>
            {quote.status && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[quote.status as keyof typeof statusColors] || statusColors.draft}`}>
                {quote.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {quote.customerName}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {quote.projectType || 'General'}
            </span>
            {quote.totalAmount && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                ${quote.totalAmount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#ea580c] transition-colors" />
      </div>

      {quote.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {quote.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-gray-500">
          <Calendar className="w-3 h-3" />
          {new Date(quote.createdAt).toLocaleDateString()}
        </span>
        {quote.hasPhotos && (
          <span className="flex items-center gap-1 text-blue-400">
            <Image className="w-3 h-3" />
            Photos
          </span>
        )}
        {quote.hasVideos && (
          <span className="flex items-center gap-1 text-purple-400">
            <Video className="w-3 h-3" />
            Videos
          </span>
        )}
        {quote.hasNotes && (
          <span className="flex items-center gap-1 text-green-400">
            <FileEdit className="w-3 h-3" />
            Notes
          </span>
        )}
        {isRecent && (
          <span className="ml-auto text-[#ea580c] font-medium">
            Recently Opened
          </span>
        )}
      </div>
    </button>
  );
}
