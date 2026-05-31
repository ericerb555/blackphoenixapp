import { useState } from 'react';
import {
  DollarSign, Calendar, User, Building2, Phone, Mail,
  MoreVertical, Plus, Filter, Search, Eye, Edit, Trash2,
  TrendingUp, Clock, Star, ArrowRight
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '../ui/table';

export function PipelineView() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const stages = [
    { id: 'lead', name: 'Lead', color: 'bg-gray-500', count: 145, value: '$580K' },
    { id: 'qualified', name: 'Qualified', color: 'bg-blue-500', count: 89, value: '$445K' },
    { id: 'proposal', name: 'Proposal', color: 'bg-purple-500', count: 56, value: '$340K' },
    { id: 'negotiation', name: 'Negotiation', color: 'bg-yellow-500', count: 34, value: '$280K' },
    { id: 'closed', name: 'Closed Won', color: 'bg-green-500', count: 28, value: '$420K' },
  ];

  const deals = {
    lead: [
      {
        id: 1,
        title: 'Enterprise CRM System',
        company: 'Tech Solutions Inc',
        contact: 'Sarah Johnson',
        value: 45000,
        probability: 20,
        expectedClose: '2026-03-15',
        lastActivity: '2 hours ago',
        priority: 'high'
      },
      {
        id: 2,
        title: 'Cloud Migration Project',
        company: 'Global Enterprises',
        contact: 'Michael Chen',
        value: 78000,
        probability: 15,
        expectedClose: '2026-04-01',
        lastActivity: '1 day ago',
        priority: 'medium'
      },
    ],
    qualified: [
      {
        id: 3,
        title: 'Software Development Services',
        company: 'Innovation Labs',
        contact: 'Emily Rodriguez',
        value: 125000,
        probability: 40,
        expectedClose: '2026-02-28',
        lastActivity: '3 hours ago',
        priority: 'high'
      },
      {
        id: 4,
        title: 'IT Consulting Package',
        company: 'StartupXYZ',
        contact: 'David Park',
        value: 52000,
        probability: 35,
        expectedClose: '2026-03-10',
        lastActivity: '5 hours ago',
        priority: 'medium'
      },
    ],
    proposal: [
      {
        id: 5,
        title: 'Digital Transformation',
        company: 'Enterprise Corp',
        contact: 'Lisa Anderson',
        value: 180000,
        probability: 60,
        expectedClose: '2026-02-20',
        lastActivity: '1 hour ago',
        priority: 'high'
      },
    ],
    negotiation: [
      {
        id: 6,
        title: 'Marketing Automation',
        company: 'Media Corporation',
        contact: 'Robert Taylor',
        value: 95000,
        probability: 75,
        expectedClose: '2026-02-15',
        lastActivity: '30 mins ago',
        priority: 'high'
      },
    ],
    closed: [
      {
        id: 7,
        title: 'Data Analytics Platform',
        company: 'Tech Innovators',
        contact: 'Jennifer Lee',
        value: 210000,
        probability: 100,
        expectedClose: '2026-01-20',
        lastActivity: '1 day ago',
        priority: 'high'
      },
    ],
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  // Flatten deals for list view
  const flattenedDeals = Object.entries(deals).flatMap(([stageId, stageDeals]) =>
    stageDeals.map((deal) => ({
      ...deal,
      stageId,
      stageName: stages.find(s => s.id === stageId)?.name || '',
      stageColor: stages.find(s => s.id === stageId)?.color || ''
    }))
  );

  const columns: DataTableColumn<typeof flattenedDeals[0]>[] = [
    {
      key: 'deal',
      header: 'Deal',
      render: (deal) => (
        <div>
          <p className="font-medium text-white">{deal.title}</p>
          <p className="text-sm text-gray-400">{deal.contact}</p>
        </div>
      )
    },
    {
      key: 'company',
      header: 'Company',
      render: (deal) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">{deal.company}</span>
        </div>
      )
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (deal) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${deal.stageColor}`}></div>
          <span className="text-sm text-gray-300">{deal.stageName}</span>
        </div>
      )
    },
    {
      key: 'value',
      header: 'Value',
      render: (deal) => (
        <div className="flex items-center gap-1 font-semibold text-white">
          <DollarSign className="w-4 h-4" />
          {deal.value.toLocaleString()}
        </div>
      )
    },
    {
      key: 'probability',
      header: 'Probability',
      render: (deal) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden max-w-[100px]">
            <div
              className="h-full bg-orange-500"
              style={{ width: `${deal.probability}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-300">{deal.probability}%</span>
        </div>
      )
    },
    {
      key: 'expectedClose',
      header: 'Expected Close',
      render: (deal) => (
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <Calendar className="w-4 h-4 text-gray-500" />
          {new Date(deal.expectedClose).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (deal) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-lg ${getPriorityColor(deal.priority)}`}>
          {deal.priority}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (deal) => (
        <div className="flex items-center justify-end gap-2">
          <button 
            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 bg-[#0A0A0A] min-h-screen">
      {/* Header */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            <button className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:bg-[#2A2A2A] transition flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#0A0A0A] rounded-xl p-1 border border-[#2A2A2A]">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${viewMode === 'kanban' ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${viewMode === 'list' ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-gray-300'}`}
              >
                List
              </button>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl hover:from-orange-700 hover:to-orange-800 transition shadow-lg shadow-orange-500/20 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Deal
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stages.map((stage) => (
          <div key={stage.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
              <h3 className="font-medium text-white">{stage.name}</h3>
            </div>
            <p className="text-2xl font-bold text-white">{stage.count}</p>
            <p className="text-sm text-gray-400 mt-1">{stage.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
                <div className={`${stage.color} text-white p-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{stage.name}</h3>
                    <span className="px-2 py-1 bg-white bg-opacity-30 rounded text-sm font-medium">
                      {deals[stage.id as keyof typeof deals]?.length || 0}
                    </span>
                  </div>
                  <p className="text-sm mt-1 opacity-90">{stage.value}</p>
                </div>
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto bg-[#0A0A0A]">
                  {deals[stage.id as keyof typeof deals]?.map((deal) => (
                    <div key={deal.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-500/30 transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-white flex-1">{deal.title}</h4>
                        <button className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          {deal.company}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <User className="w-4 h-4 text-gray-500" />
                          {deal.contact}
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2 border-t border-[#2A2A2A]">
                        <div className="flex items-center gap-1 text-sm font-semibold text-white">
                          <DollarSign className="w-4 h-4" />
                          {deal.value.toLocaleString()}
                        </div>
                        <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded font-medium">
                          {deal.probability}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2A2A2A]">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(deal.expectedClose).toLocaleDateString()}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${getPriorityColor(deal.priority)}`}>
                          {deal.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                        <Clock className="w-3 h-3" />
                        {deal.lastActivity}
                      </div>
                    </div>
                  ))}
                  
                  <button className="w-full py-2 text-sm text-gray-400 border-2 border-dashed border-[#2A2A2A] rounded-xl hover:border-orange-500/30 hover:text-orange-400 transition-colors">
                    + Add Deal
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <DataTable
          columns={columns}
          data={flattenedDeals}
          rowHoverEffect={true}
          containerClassName="bg-[#1A1A1A] border-[#2A2A2A]"
        />
      )}
    </div>
  );
}
