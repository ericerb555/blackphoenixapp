import { Eye, Edit } from 'lucide-react';

interface EmployeePayroll {
  id: string;
  employeeName: string;
  position: string;
  payRate: number;
  payType: 'hourly' | 'salary';
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  deductions: number;
  taxWithholding: number;
  benefits: number;
  netPay: number;
}

interface EmployeePayrollTableProps {
  employees: EmployeePayroll[];
}

export function EmployeePayrollTable({ employees }: EmployeePayrollTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
      <div className="p-6 border-b border-[#2A2A2A]">
        <h2 className="text-xl font-bold">Employee Payroll Breakdown</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#0A0A0A]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Employee</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Position</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Pay Rate</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Hours</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Regular</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">OT Pay</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Deductions</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Net Pay</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-[#0A0A0A] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-[#ea580c] to-[#dc2626] rounded-full flex items-center justify-center font-semibold">
                      {emp.employeeName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-medium">{emp.employeeName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400">{emp.position}</td>
                <td className="px-6 py-4">
                  <span className="font-semibold">{formatCurrency(emp.payRate)}</span>
                  <span className="text-gray-400 text-sm">/{emp.payType === 'hourly' ? 'hr' : 'yr'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div>{emp.regularHours} reg</div>
                    {emp.overtimeHours > 0 && (
                      <div className="text-yellow-500">{emp.overtimeHours} OT</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold text-green-500">
                  {formatCurrency(emp.regularPay)}
                </td>
                <td className="px-6 py-4 font-semibold text-yellow-500">
                  {emp.overtimeHours > 0 ? formatCurrency(emp.overtimePay) : '-'}
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {formatCurrency(emp.deductions + emp.taxWithholding + emp.benefits)}
                </td>
                <td className="px-6 py-4 font-bold text-[#ea580c]">
                  {formatCurrency(emp.netPay)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors">
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors">
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[#0A0A0A] border-t-2 border-[#ea580c]">
            <tr>
              <td colSpan={4} className="px-6 py-4 font-bold">TOTAL</td>
              <td className="px-6 py-4 font-bold text-green-500">
                {formatCurrency(employees.reduce((sum, emp) => sum + emp.regularPay, 0))}
              </td>
              <td className="px-6 py-4 font-bold text-yellow-500">
                {formatCurrency(employees.reduce((sum, emp) => sum + emp.overtimePay, 0))}
              </td>
              <td className="px-6 py-4 font-bold text-gray-400">
                {formatCurrency(employees.reduce((sum, emp) => sum + emp.deductions + emp.taxWithholding + emp.benefits, 0))}
              </td>
              <td className="px-6 py-4 font-bold text-[#ea580c]">
                {formatCurrency(employees.reduce((sum, emp) => sum + emp.netPay, 0))}
              </td>
              <td className="px-6 py-4"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
