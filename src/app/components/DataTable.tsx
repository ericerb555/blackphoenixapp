import React from 'react';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  keyField?: string;
}

export function DataTable({ columns, data, keyField = 'id' }: DataTableProps) {
  return (
    <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 bg-[#0f0f0f]">
            {columns.map((column) => (
              <th key={column.key} className="text-left p-4 text-gray-400 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row[keyField]} className="border-b border-gray-800 hover:bg-[#2a2a2a] transition-colors">
              {columns.map((column) => (
                <td key={column.key} className="p-4">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
