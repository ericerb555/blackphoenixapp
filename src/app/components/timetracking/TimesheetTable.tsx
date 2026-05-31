import { Search, Download, Edit, Trash2, Briefcase } from 'lucide-react';

interface TimeEntry {
  id: string;
  employeeName: string;
  projectName?: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  overtimeHours?: number;
  status: 'active' | 'completed' | 'pending' | 'approved' | 'rejected';
}

interface TimesheetTableProps {
  entries: TimeEntry[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedEmployee: string;
  onEmployeeChange: (id: string) => void;
  selectedProject: string;
  onProjectChange: (id: string) => void;
}

export function TimesheetTable({
  entries,
  searchTerm,
  onSearchChange,
  selectedEmployee,
  onEmployeeChange,
  selectedProject,
  onProjectChange
}: TimesheetTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status: TimeEntry['status']) => {
    const colors = {
      active: 'bg-green-600',
      completed: 'bg-blue-600',
      pending: 'bg-yellow-600',
      approved: 'bg-emerald-600',
      rejected: 'bg-red-600'
    };
    return colors[status] || 'bg-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search employees..."
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#ea580c]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => onEmployeeChange(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="all">All Employees</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => onProjectChange(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="all">All Projects</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Actions</label>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:from-[#dc2626] hover:to-[#ea580c] rounded-lg font-semibold transition-all">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Employee</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Project</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Clock In</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Clock Out</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Total</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">OT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#0A0A0A] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-[#ea580c] to-[#dc2626] rounded-full flex items-center justify-center font-semibold">
                        {entry.employeeName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium">{entry.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {entry.projectName ? (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span>{entry.projectName}</span>
                      </div>
                    ) : <span className="text-gray-500">-</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{formatDate(entry.clockIn)}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {entry.clockOut ? formatDate(entry.clockOut) : '-'}
                  </td>
                  <td className="px-6 py-4 font-semibold text-[#ea580c]">
                    {entry.totalHours?.toFixed(2) || '-'}
                  </td>
                  <td className="px-6 py-4 font-semibold text-yellow-500">
                    {entry.overtimeHours?.toFixed(2) || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors">
                        <Edit className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
