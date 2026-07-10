/**
 * SimpleTable Component
 * 
 * A lightweight table component for simple use cases without advanced features.
 * Perfect for static data or when you don't need sorting/filtering.
 * 
 * @example
 * <SimpleTable
 *   headers={['Name', 'Email', 'Status']}
 *   rows={[
 *     ['John Doe', 'john@example.com', 'Active'],
 *     ['Jane Smith', 'jane@example.com', 'Inactive']
 *   ]}
 * />
 */

import React from 'react';

export interface SimpleTableProps {
  headers: (string | React.ReactNode)[];
  rows: (string | number | React.ReactNode)[][];
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  rowClassName?: string;
  cellClassName?: string;
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  hoverable?: boolean;
}

export function SimpleTable({
  headers,
  rows,
  className = '',
  containerClassName = '',
  headerClassName = '',
  rowClassName = '',
  cellClassName = '',
  striped = false,
  bordered = true,
  compact = false,
  hoverable = true,
}: SimpleTableProps) {
  return (
    <div className={`bg-[#1A1A1A] ${bordered ? 'border border-[#2A2A2A]' : ''} rounded-2xl overflow-hidden ${containerClassName}`}>
      <div className="overflow-x-auto">
        <table className={`w-full ${className}`}>
          <thead className={`bg-[#0A0A0A] border-b border-[#2A2A2A] ${headerClassName}`}>
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className={`${compact ? 'px-4 py-2' : 'px-6 py-3'} text-left text-xs font-semibold text-gray-400 uppercase`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-[#2A2A2A] last:border-0 ${
                  hoverable ? 'hover:bg-[#2A2A2A]/50 transition-colors' : ''
                } ${striped && rowIndex % 2 === 1 ? 'bg-[#0A0A0A]/30' : ''} ${rowClassName}`}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`${compact ? 'px-4 py-2' : 'px-6 py-4'} text-sm text-gray-300 ${cellClassName}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
