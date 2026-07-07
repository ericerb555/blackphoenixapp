import { Users, Plus, Award, FileText, Calendar, CheckCircle, AlertTriangle, Shield } from 'lucide-react';

export default function LicensedProfessionalManagement() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Licensed Professional Management</h2>
              <p className="text-blue-100">Manage architects, engineers, and licensed contractors</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium">
            <Plus className="w-4 h-4" />
            Add Professional
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-700">Total Professionals</p>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-600 mt-1">Licensed staff</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-emerald-700">Active Licenses</p>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-600 mt-1">Current & valid</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-amber-700">Expiring Soon</p>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-600 mt-1">Next 90 days</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-700">Specialties</p>
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-600 mt-1">Different types</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Architects</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">No architects added</p>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Add Architect
              </button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Architects</strong> design building structures and ensure compliance with building codes and regulations.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Engineers</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">No engineers added</p>
              <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Add Engineer
              </button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs text-emerald-800">
              <strong>Engineers</strong> provide technical expertise for structural, electrical, mechanical, and civil projects.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Contractors</h3>
          </div>
          <div className="space-y-3">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">No contractors added</p>
              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                Add Contractor
              </button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-800">
              <strong>Licensed Contractors</strong> have state/local licenses to perform specific construction work.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">License Renewals</h3>
              <p className="text-sm text-gray-600 mt-1">Track upcoming license expirations and renewals</p>
            </div>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Licenses to Track</h4>
          <p className="text-gray-600">Add licensed professionals to monitor their credentials</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Why Track Licensed Professionals?</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <span>Ensure compliance with local regulations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <span>Never miss a license renewal deadline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <span>Maintain professional credentials</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <span>Access specialized expertise</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <span>Store license documents and certificates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <span>Assign professionals to projects</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 mb-1">License Requirements Vary by State</h4>
            <p className="text-sm text-amber-800">
              Make sure to check your state and local requirements for architects, engineers, and contractors. Some jurisdictions require specific licenses for certain types of work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
