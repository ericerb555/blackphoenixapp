import { useState } from 'react';
import { PERMISSIONS, getPermissionCategories, getPermissionsByCategory, Role } from '../lib/permissions';
import { X, Check, Minus, Download, Search, Filter } from 'lucide-react';
import { DataTable } from './ui/table/DataTable';
import type { DataTableColumn } from './ui/table/DataTable';

interface PermissionMatrixProps {
  roles: Role[];
  onClose: () => void;
}

export default function PermissionMatrix({ roles, onClose }: PermissionMatrixProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = getPermissionCategories();
  const allPermissions = selectedCategory === 'all'
    ? Object.values(PERMISSIONS)
    : getPermissionsByCategory(selectedCategory as any);

  const filteredPermissions = allPermissions.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic Permission Matrix Columns
  const permissionColumns: DataTableColumn<typeof filteredPermissions[0]>[] = [
    {
      key: 'permission',
      header: 'Permission',
      render: (permission) => (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full font-semibold">
            {permission.action}
          </span>
          <span className="text-white">{permission.name}</span>
        </div>
      ),
      className: 'sticky left-0 bg-[#1A1A1A] z-20'
    },
    {
      key: 'description',
      header: 'Description',
      render: (permission) => (
        <div className="flex flex-col gap-1">
          <span className="text-gray-300">{permission.description}</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
              {permission.category}
            </span>
            <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">
              {permission.scope}
            </span>
          </div>
        </div>
      ),
      className: 'min-w-[200px]'
    },
    ...roles.map(role => ({
      key: `role-${role.id}`,
      header: (
        <div className="flex flex-col items-center gap-1">
          <span className="text-white">{role.name}</span>
          <span className="text-xs font-normal text-gray-500">
            {role.permissions.length} perms
          </span>
        </div>
      ),
      render: (permission: typeof filteredPermissions[0]) => {
        const hasPermission = role.permissions.includes(permission.id);
        return (
          <div className="flex justify-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              hasPermission ? 'bg-green-500/20' : 'bg-gray-500/20'
            }`}>
              {hasPermission ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Minus className="w-4 h-4 text-gray-600" />
              )}
            </div>
          </div>
        );
      },
      align: 'center' as const,
      className: 'min-w-[120px]'
    }))
  ];

  const exportMatrix = () => {
    const csv: string[] = [];
    
    // Header
    const header = ['Permission', ...roles.map(r => r.name)];
    csv.push(header.join(','));
    
    // Rows
    filteredPermissions.forEach(permission => {
      const row = [
        `"${permission.name}"`,
        ...roles.map(role =>
          role.permissions.includes(permission.id) ? 'Yes' : 'No'
        ),
      ];
      csv.push(row.join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `permission-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-[#2A2A2A]">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Permission Matrix</h3>
            <p className="text-sm text-gray-400 mt-1">
              View all role permissions in one place
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportMatrix}
              className="flex items-center gap-2 px-4 py-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors font-medium"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#0A0A0A]">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="min-w-max">
            <DataTable
              columns={permissionColumns}
              data={filteredPermissions}
              emptyMessage="No permissions found matching your criteria"
              rowHoverEffect={true}
              containerClassName="bg-[#1A1A1A] border-[#2A2A2A]"
              stickyHeader={true}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2A2A2A] bg-[#0A0A0A]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {filteredPermissions.length} of {Object.keys(PERMISSIONS).length} permissions
              across {roles.length} roles
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-gray-400">Has Permission</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                    <Minus className="w-3 h-3 text-gray-600" />
                  </div>
                  <span className="text-gray-400">No Permission</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
