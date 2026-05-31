/**
 * Landlord Portal Demo Component
 * 
 * Interactive demo modal for landlords
 */

import { motion } from 'motion/react';
import { X, Home, Users, Wrench, DollarSign, FileText, TrendingUp, CheckCircle, Shield } from 'lucide-react';

interface LandlordPortalDemoProps {
  onClose: () => void;
  onAccessPortal: () => void;
}

export default function LandlordPortalDemo({ onClose, onAccessPortal }: LandlordPortalDemoProps) {
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
            <h2 className="text-2xl font-bold text-white mb-1">Landlord Portal</h2>
            <p className="text-gray-400">Comprehensive property and tenant management</p>
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
              <Home className="w-8 h-8 text-[#ea580c] mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Property Dashboard</h3>
              <p className="text-gray-400 text-sm">Centralized view of all your rental properties with real-time status updates.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <Users className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Tenant Management</h3>
              <p className="text-gray-400 text-sm">Manage tenant information, lease agreements, and communication in one place.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <Wrench className="w-8 h-8 text-green-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Maintenance Requests</h3>
              <p className="text-gray-400 text-sm">Track and manage maintenance requests with automated vendor dispatch.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <DollarSign className="w-8 h-8 text-yellow-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Rent Collection</h3>
              <p className="text-gray-400 text-sm">Automated rent collection with payment tracking and late fee management.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <FileText className="w-8 h-8 text-purple-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Document Management</h3>
              <p className="text-gray-400 text-sm">Store and manage leases, contracts, and important property documents.</p>
            </div>

            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
              <TrendingUp className="w-8 h-8 text-pink-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Financial Reports</h3>
              <p className="text-gray-400 text-sm">Comprehensive income and expense reports for all your properties.</p>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="bg-gradient-to-br from-[#ea580c]/10 to-orange-700/10 border border-[#ea580c]/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Key Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Automate rent collection and reminders</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Track all property expenses and income</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Streamline maintenance workflows</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Digital lease signing and storage</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Tenant screening and background checks</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Mobile app for on-the-go management</span>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5 flex items-start gap-3">
            <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-bold mb-1">Bank-Level Security</h4>
              <p className="text-gray-400 text-sm">All tenant data and financial information is encrypted and securely stored with enterprise-grade protection.</p>
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
