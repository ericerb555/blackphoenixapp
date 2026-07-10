/**
 * DataTable Component
 * 
 * A comprehensive, reusable table component with built-in features:
 * - Responsive design with horizontal scroll
 * - Consistent theming (deep orange dark theme)
 * - Built-in client-side sorting (automatic or controlled)
 * - Built-in client-side pagination (automatic or controlled)
 * - Loading and empty states
 * - Flexible column configuration
 * - Row click handlers
 * - Custom cell renderers
 * 
 * @example
 * // Automatic sorting and pagination
 * <DataTable
 *   columns={[
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'age', header: 'Age', sortable: true, sortFn: (a, b) => a.age - b.age },
 *     { key: 'email', header: 'Email' },
 *     { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> }
 *   ]}
 *   data={users}
 *   loading={isLoading}
 *   defaultSort={{ key: 'name', direction: 'asc' }}
 *   pagination={true}
 *   pageSize={25}
 * />
 * 
 * @example
 * // Controlled sorting (parent manages state)
 * <DataTable
 *   columns={columns}
 *   data={users}
 *   sortBy={sortKey}
 *   sortDirection={sortDir}
 *   onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
 * />
 */

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface DataTableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  sortFn?: (a: T, b: T, key: string) => number; // Custom sort function for complex sorting
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
  headerRender?: () => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  data: T[]; // Each row should have an 'id' or 'key' property for optimal rendering
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: string | ((row: T, index: number) => string);
  
  // Sorting props (controlled mode)
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  
  // Automatic sorting (uncontrolled mode)
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  
  // Pagination props
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  currentPage?: number; // Controlled pagination
  onPageChange?: (page: number) => void; // Controlled pagination
  
  // Styling props
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowHoverEffect?: boolean;
  stickyHeader?: boolean;
}

export function DataTable<T = any>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowClassName,
  sortBy: controlledSortBy,
  sortDirection: controlledSortDirection = 'asc',
  onSort: controlledOnSort,
  defaultSort,
  pagination = false,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  currentPage: controlledCurrentPage,
  onPageChange: controlledOnPageChange,
  className = '',
  containerClassName = '',
  headerClassName = '',
  bodyClassName = '',
  rowHoverEffect = true,
  stickyHeader = false,
}: DataTableProps<T>) {
  // Internal state for automatic sorting (uncontrolled mode)
  const [internalSortBy, setInternalSortBy] = useState<string | undefined>(defaultSort?.key);
  const [internalSortDirection, setInternalSortDirection] = useState<'asc' | 'desc'>(defaultSort?.direction || 'asc');

  // Internal state for pagination (uncontrolled mode)
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);

  // Determine if we're in controlled or uncontrolled mode
  const isControlled = controlledOnSort !== undefined;
  const sortBy = isControlled ? controlledSortBy : internalSortBy;
  const sortDirection = isControlled ? controlledSortDirection : internalSortDirection;

  const isPaginationControlled = controlledOnPageChange !== undefined;
  const currentPage = isPaginationControlled ? (controlledCurrentPage || 1) : internalCurrentPage;
  const activePageSize = internalPageSize;

  // Sort the data automatically (uncontrolled mode only)
  const sortedData = useMemo(() => {
    if (isControlled || !sortBy) {
      return data; // Don't sort if controlled or no sort active
    }

    const column = columns.find(col => col.key === sortBy);
    if (!column || !column.sortable) {
      return data;
    }

    return [...data].sort((a, b) => {
      // Use custom sort function if provided
      if (column.sortFn) {
        const result = column.sortFn(a, b, sortBy);
        return sortDirection === 'asc' ? result : -result;
      }

      // Default sorting logic
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle different types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime() 
          : bValue.getTime() - aValue.getTime();
      }

      // Fallback to string comparison
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortBy, sortDirection, columns, isControlled]);

  // Paginate the data
  const paginatedData = useMemo(() => {
    if (!pagination) {
      return sortedData;
    }

    const startIndex = (currentPage - 1) * activePageSize;
    const endIndex = startIndex + activePageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, pagination, currentPage, activePageSize]);

  // Calculate pagination info
  const totalPages = pagination ? Math.ceil(sortedData.length / activePageSize) : 1;
  const startRecord = pagination ? (currentPage - 1) * activePageSize + 1 : 1;
  const endRecord = pagination ? Math.min(currentPage * activePageSize, sortedData.length) : sortedData.length;
  const totalRecords = sortedData.length;

  const handleSort = (key: string) => {
    if (isControlled) {
      // Controlled mode: call parent's onSort
      const newDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc';
      controlledOnSort(key, newDirection);
    } else {
      // Uncontrolled mode: manage state internally
      const newDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc';
      setInternalSortBy(key);
      setInternalSortDirection(newDirection);
    }
  };

  const handlePageChange = (page: number) => {
    if (isPaginationControlled) {
      controlledOnPageChange?.(page);
    } else {
      setInternalCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setInternalPageSize(size);
    // Reset to page 1 when changing page size
    if (isPaginationControlled) {
      controlledOnPageChange?.(1);
    } else {
      setInternalCurrentPage(1);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-500" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-[#ea580c]" />
    ) : (
      <ChevronDown className="w-4 h-4 text-[#ea580c]" />
    );
  };

  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  if (loading) {
    return (
      <div className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden ${containerClassName}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea580c]"></div>
          <span className="ml-3 text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden ${containerClassName}`}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-400 text-lg">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden ${containerClassName}`}>
      <div className="overflow-x-auto">
        <table className={`w-full ${className}`}>
          <thead className={`bg-[#0A0A0A] border-b border-[#2A2A2A] ${stickyHeader ? 'sticky top-0 z-10' : ''} ${headerClassName}`}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-xs font-semibold text-gray-400 uppercase ${getAlignmentClass(column.align)} ${
                    column.sortable ? 'cursor-pointer select-none hover:text-gray-300' : ''
                  } ${column.width ? `w-[${column.width}]` : ''} ${column.className || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={column.width ? { width: column.width } : undefined}
                >
                  <div className="flex items-center gap-2">
                    {column.headerRender ? column.headerRender() : column.header}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={bodyClassName}>
            {paginatedData.map((row, rowIndex) => {
              // Try to get a unique key from the row data
              const uniqueKey = (row as any).id || (row as any).key || `row-${rowIndex}`;
              return (
                <tr
                  key={uniqueKey}
                  className={`border-b border-[#2A2A2A] last:border-0 ${
                    rowHoverEffect ? 'hover:bg-[#2A2A2A]/50 transition-colors' : ''
                  } ${onRowClick ? 'cursor-pointer' : ''} ${
                    rowClassName 
                      ? typeof rowClassName === 'function' 
                        ? rowClassName(row, rowIndex) 
                        : rowClassName
                      : ''
                  }`}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {columns.map((column) => (
                    <td
                      key={`${uniqueKey}-${column.key}`}
                      className={`px-6 py-4 text-sm text-gray-300 ${getAlignmentClass(column.align)} ${column.className || ''}`}
                    >
                      {column.render ? column.render(row, rowIndex) : (row as any)[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {pagination && totalPages > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2A2A2A] bg-[#0A0A0A]">
          {/* Left: Records info */}
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-400">
              Showing <span className="font-semibold text-white">{startRecord}</span> to{' '}
              <span className="font-semibold text-white">{endRecord}</span> of{' '}
              <span className="font-semibold text-white">{totalRecords}</span> results
            </p>
            
            {/* Page size selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Show:</label>
              <select
                value={activePageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Page navigation */}
          <div className="flex items-center gap-2">
            {/* First page */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition ${
                currentPage === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
              }`}
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous page */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg transition ${
                currentPage === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
              }`}
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      currentPage === pageNum
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next page */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg transition ${
                currentPage === totalPages
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
              }`}
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last page */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg transition ${
                currentPage === totalPages
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
              }`}
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
