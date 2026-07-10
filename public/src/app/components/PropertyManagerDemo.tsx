/**
 * Property Manager Demo Component
 * 
 * Interactive demo modal for property managers
 */

import { motion } from 'motion/react';
import { X, Building, Users, Wrench, DollarSign, Calendar, TrendingUp, CheckCircle } from 'lucide-react';

interface PropertyManagerDemoProps {
  onClose: () => void;
  onAccessPortal: () => void;
}

export default function PropertyManagerDemo({ onClose, onAccessPortal }: PropertyManagerDemoProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Property Manager Portal</h2>
            <p className="text-gray-400">Comprehensive property management solution</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <Building className="w-8 h-8 text-[#ea580c] mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Multi-Property Management</h3>
              <p className="text-gray-400 text-sm">Manage all your properties from one centralized dashboard with real-time updates.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <Users className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Tenant Portal</h3>
              <p className="text-gray-400 text-sm">Streamlined communication with tenants for requests, payments, and notifications.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <Wrench className="w-8 h-8 text-green-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Maintenance Tracking</h3>
              <p className="text-gray-400 text-sm">Track work orders, vendor assignments, and completion status in real-time.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <DollarSign className="w-8 h-8 text-yellow-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Financial Reporting</h3>
              <p className="text-gray-400 text-sm">Comprehensive financial analytics and reporting for all your properties.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <Calendar className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Smart Scheduling</h3>
              <p className="text-gray-400 text-sm">Automated scheduling for maintenance, inspections, and vendor appointments.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <TrendingUp className="w-8 h-8 text-pink-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Performance Analytics</h3>
              <p className="text-gray-400 text-sm">Track occupancy rates, revenue, and operational efficiency across all properties.</p>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="bg-gradient-to-br from-[#ea580c]/10 to-orange-700/10 border border-[#ea580c]/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Key Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Reduce maintenance response time by 60%</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Increase tenant satisfaction scores</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Automate routine administrative tasks</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Real-time financial visibility</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Mobile access for on-the-go management</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Integrated vendor marketplace</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] hover:bg-[#2A2A2A] rounded-xl text-white font-bold transition-all"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onAccessPortal();
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-orange-700 hover:shadow-xl hover:shadow-[#ea580c]/50 rounded-xl text-white font-bold transition-all"
            >
              Access Portal
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
