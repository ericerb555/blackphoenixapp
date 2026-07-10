/**
 * Mobile Owner Portal - Mobile-Optimized Version
 * 
 * Features:
 * - Touch-optimized interface
 * - Quick approval swipe actions
 * - Mobile video recording
 * - Offline support
 * - Push notifications
 */

import { useState } from 'react';
import {
  Crown, CheckCircle, XCircle, Video, Folder, Users, 
  Camera, ChevronRight, DollarSign, Clock, AlertCircle,
  Bell, Settings, Menu, X, Phone, Mail, MapPin, Activity,
  FileText, Upload, Download, Eye, Share2, Filter
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { IconButton } from './ui/button';

interface MobileOwnerPortalProps {
  ownerId: string;
  ownerName: string;
}

export default function MobileOwnerPortal({ ownerId, ownerName }: MobileOwnerPortalProps) {
  const [activeView, setActiveView] = useState<'dashboard' | 'approvals' | 'video' | 'files'>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const pendingApprovals = 5;
  const pendingVideos = 3;
  const totalFiles = 12;

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] pb-20">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-[#ea580c] to-[#c2410c] p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 bg-white/10 rounded-lg"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Owner Portal</h1>
              <p className="text-xs text-white/80">{ownerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingApprovals > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-white" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{pendingApprovals}</span>
                </div>
              </div>
            )}
            <button className="p-2 bg-white/10 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setActiveView('approvals')}
            className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl p-4 text-left active:scale-95 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <span className="text-2xl font-bold text-white">{pendingApprovals}</span>
            </div>
            <p className="text-sm font-semibold text-white">Pending Approvals</p>
            <p className="text-xs text-gray-400 mt-1">Requires action</p>
          </button>

          <button 
            onClick={() => setActiveView('video')}
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4 text-left active:scale-95 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <Video className="w-6 h-6 text-blue-400" />
              <span className="text-2xl font-bold text-white">{pendingVideos}</span>
            </div>
            <p className="text-sm font-semibold text-white">Work Requests</p>
            <p className="text-xs text-gray-400 mt-1">Ready to assign</p>
          </button>
        </div>

        <button 
          onClick={() => setActiveView('files')}
          className="w-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 text-left active:scale-95 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Folder className="w-6 h-6 text-purple-400" />
              <div>
                <p className="text-sm font-semibold text-white">My Files</p>
                <p className="text-xs text-gray-400">{totalFiles} files stored</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-4">
        <h2 className="text-sm font-bold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl active:scale-95 transition">
            <Camera className="w-5 h-5 text-[#ea580c] mb-2" />
            <p className="text-xs font-semibold text-white">Record Video</p>
          </button>
          <button className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl active:scale-95 transition">
            <Upload className="w-5 h-5 text-[#ea580c] mb-2" />
            <p className="text-xs font-semibold text-white">Upload File</p>
          </button>
          <button className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl active:scale-95 transition">
            <Users className="w-5 h-5 text-[#ea580c] mb-2" />
            <p className="text-xs font-semibold text-white">View Customers</p>
          </button>
          <button className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl active:scale-95 transition">
            <Activity className="w-5 h-5 text-[#ea580c] mb-2" />
            <p className="text-xs font-semibold text-white">Activity Log</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Recent Activity</h2>
          <button className="text-xs text-[#ea580c] font-semibold">View All</button>
        </div>
        <div className="space-y-2">
          {[
            { icon: CheckCircle, text: 'Approved quote #2451', time: '10 min ago', color: 'text-green-400' },
            { icon: Video, text: 'Recorded site inspection', time: '1 hour ago', color: 'text-blue-400' },
            { icon: Users, text: 'Assigned work to Acme Corp', time: '2 hours ago', color: 'text-purple-400' }
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
              <div className={`p-2 bg-[#0A0A0A] rounded-lg`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">{item.text}</p>
                <p className="text-xs text-gray-400">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-[#2A2A2A] p-2 grid grid-cols-4 gap-1">
        <button 
          onClick={() => setActiveView('dashboard')}
          className={`p-3 rounded-xl transition ${
            activeView === 'dashboard' ? 'bg-[#ea580c] text-white' : 'text-gray-400'
          }`}
        >
          <Crown className="w-5 h-5 mx-auto mb-1" />
          <p className="text-xs font-semibold">Dashboard</p>
        </button>
        <button 
          onClick={() => setActiveView('approvals')}
          className={`p-3 rounded-xl transition relative ${
            activeView === 'approvals' ? 'bg-[#ea580c] text-white' : 'text-gray-400'
          }`}
        >
          {pendingApprovals > 0 && (
            <div className="absolute top-2 right-2 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{pendingApprovals}</span>
            </div>
          )}
          <CheckCircle className="w-5 h-5 mx-auto mb-1" />
          <p className="text-xs font-semibold">Approvals</p>
        </button>
        <button 
          onClick={() => setActiveView('video')}
          className={`p-3 rounded-xl transition ${
            activeView === 'video' ? 'bg-[#ea580c] text-white' : 'text-gray-400'
          }`}
        >
          <Video className="w-5 h-5 mx-auto mb-1" />
          <p className="text-xs font-semibold">Videos</p>
        </button>
        <button 
          onClick={() => setActiveView('files')}
          className={`p-3 rounded-xl transition ${
            activeView === 'files' ? 'bg-[#ea580c] text-white' : 'text-gray-400'
          }`}
        >
          <Folder className="w-5 h-5 mx-auto mb-1" />
          <p className="text-xs font-semibold">Files</p>
        </button>
      </div>

      {/* Side Menu */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-50"
          onClick={() => setMenuOpen(false)}
        >
          <div 
            className="w-64 h-full bg-[#1A1A1A] border-r border-[#2A2A2A] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Menu</h2>
              <IconButton
                icon={<X />}
                onClick={() => setMenuOpen(false)}
                variant="ghost"
                size="sm"
                className="hover:bg-[#2A2A2A]"
              />
            </div>
            <div className="space-y-2">
              {[
                { icon: Crown, label: 'Dashboard' },
                { icon: CheckCircle, label: 'Approvals', badge: pendingApprovals },
                { icon: Video, label: 'Work Requests' },
                { icon: Folder, label: 'My Files' },
                { icon: Users, label: 'Customers' },
                { icon: Activity, label: 'Activity Log' },
                { icon: Settings, label: 'Settings' }
              ].map((item, index) => (
                <button 
                  key={index}
                  className="w-full flex items-center justify-between p-3 bg-[#0A0A0A] rounded-xl hover:bg-[#2A2A2A] transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-semibold text-white">{item.label}</span>
                  </div>
                  {item.badge && (
                    <div className="px-2 py-0.5 bg-red-600 rounded-full">
                      <span className="text-xs font-bold text-white">{item.badge}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
