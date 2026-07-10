/**
 * Integrated Owner Portal - Multi-Owner Support with Action Tracking
 * 
 * Features:
 * - Multiple owner portals with individual tracking
 * - Video capture with owner attribution
 * - Approval queue with action logging
 * - Owner-specific file management
 * - Complete action history and coding
 */

import { useState, useRef, useEffect } from 'react';
import {
  Crown, CheckCircle, XCircle, Clock, Video, Upload, Folder,
  FileText, Users, Building2, AlertCircle, Play, Pause, Square,
  Trash2, Download, Eye, Plus, Search, Filter, ChevronDown,
  ChevronRight, Camera, Mic, MicOff, Settings, Link, Send,
  ArrowRight, Star, TrendingUp, DollarSign, Package, Check,
  X, MoreVertical, Calendar, Tag, MapPin, Phone, Mail,
  Paperclip, Image, FileVideo, RefreshCw, Edit, Copy, Activity,
  BarChart3, User, Shield, Database, Lock, Zap
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

type PortalTab = 'approvals' | 'requests' | 'folders' | 'customers' | 'tracking';

interface OwnerProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'primary' | 'secondary' | 'regional';
  permissions: string[];
  createdAt: string;
}

interface ActionLog {
  id: string;
  ownerId: string;
  ownerName: string;
  action: string;
  type: 'approval' | 'video' | 'assignment' | 'creation' | 'modification';
  targetId: string;
  targetType: string;
  details: any;
  timestamp: string;
  ipAddress?: string;
  device?: string;
}

interface ApprovalItem {
  id: string;
  type: 'quote' | 'invoice' | 'user' | 'payment' | 'contract' | 'access';
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  amount?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected';
  details: any;
  ownerId?: string;
  ownerAction?: string;
  ownerTimestamp?: string;
}

interface WorkRequest {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  videoUrl?: string;
  files: FileItem[];
  createdAt: string;
  status: 'draft' | 'ready' | 'assigned';
  customerId?: string;
  customerName?: string;
  trackingCode: string;
}

interface FileItem {
  id: string;
  ownerId: string;
  name: string;
  type: 'video' | 'image' | 'document';
  size: number;
  url: string;
  uploadedAt: string;
  thumbnail?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'pending' | 'inactive';
  avatar?: string;
}

interface OwnerPortalIntegratedProps {
  currentOwner: OwnerProfile;
  onSwitchOwner?: (ownerId: string) => void;
  owners?: OwnerProfile[];
}

export default function OwnerPortalIntegrated({ currentOwner, onSwitchOwner, owners = [] }: OwnerPortalIntegratedProps) {
  const [activeTab, setActiveTab] = useState<PortalTab>('approvals');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Action Tracking
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);

  // Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedVideos, setRecordedVideos] = useState<string[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Work Request State
  const [workRequestTitle, setWorkRequestTitle] = useState('');
  const [workRequestDescription, setWorkRequestDescription] = useState('');
  const [workRequestFiles, setWorkRequestFiles] = useState<FileItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  // Sample Data - filtered by owner
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: '1',
      type: 'quote',
      title: 'Large Installation Project Quote',
      description: 'Commercial HVAC installation for BuildCo headquarters - $125,000',
      requestedBy: 'John Smith (Sales Manager)',
      requestedAt: '2 hours ago',
      amount: 125000,
      priority: 'high',
      status: 'pending',
      details: { customer: 'BuildCo LLC', items: 15, discount: 10 }
    },
    {
      id: '2',
      type: 'user',
      title: 'New Admin User Access Request',
      description: 'Sarah Johnson requesting admin level access to financial reports',
      requestedBy: 'Sarah Johnson (Accountant)',
      requestedAt: '4 hours ago',
      priority: 'medium',
      status: 'pending',
      details: { role: 'Admin', permissions: ['financials', 'reports', 'users'] }
    }
  ]);

  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);

  const [customers] = useState<Customer[]>([
    {
      id: '1',
      name: 'John Peterson',
      email: 'john@acmecorp.com',
      phone: '(555) 123-4567',
      company: 'Acme Corp',
      status: 'active'
    },
    {
      id: '2',
      name: 'Sarah Martinez',
      email: 'sarah@techstart.com',
      phone: '(555) 234-5678',
      company: 'TechStart Inc',
      status: 'active'
    }
  ]);

  // Log Action Function
  const logAction = (action: string, type: ActionLog['type'], targetId: string, targetType: string, details: any) => {
    const log: ActionLog = {
      id: Date.now().toString(),
      ownerId: currentOwner.id,
      ownerName: currentOwner.name,
      action,
      type,
      targetId,
      targetType,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.100', // Would be real IP in production
      device: navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown'
    };
    setActionLogs(prev => [log, ...prev]);
  };

  // Video Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideos(prev => [...prev, url]);
        
        const newFile: FileItem = {
          id: Date.now().toString(),
          ownerId: currentOwner.id,
          name: `${currentOwner.name.replace(/\s/g, '_')}-recording-${Date.now()}.webm`,
          type: 'video',
          size: blob.size,
          url: url,
          uploadedAt: new Date().toISOString(),
          thumbnail: url
        };
        setWorkRequestFiles(prev => [...prev, newFile]);
        
        // Log video recording action
        logAction('Recorded video', 'video', newFile.id, 'video_file', { size: blob.size, duration: recordingTime });
        
        toast.success('Video recorded successfully!');
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        toast.success('Recording resumed');
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        toast.success('Recording paused');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate unique tracking code
  const generateTrackingCode = () => {
    const ownerInitials = currentOwner.name.split(' ').map(n => n[0]).join('');
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${ownerInitials}-WR-${timestamp}`;
  };

  // Approval Actions
  const handleApproval = (id: string, approved: boolean) => {
    const item = approvals.find(a => a.id === id);
    if (!item) return;

    setApprovals(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            status: approved ? 'approved' : 'rejected',
            ownerId: currentOwner.id,
            ownerAction: currentOwner.name,
            ownerTimestamp: new Date().toISOString()
          }
        : item
    ));

    // Log approval action
    logAction(
      `${approved ? 'Approved' : 'Rejected'} ${item.type}`,
      'approval',
      id,
      item.type,
      { title: item.title, amount: item.amount, decision: approved }
    );

    toast.success(`${approved ? 'Approved' : 'Rejected'} successfully!`);
  };

  // Work Request Actions
  const createWorkRequest = () => {
    if (!workRequestTitle || !workRequestDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    const trackingCode = generateTrackingCode();
    const newRequest: WorkRequest = {
      id: Date.now().toString(),
      ownerId: currentOwner.id,
      ownerName: currentOwner.name,
      title: workRequestTitle,
      description: workRequestDescription,
      files: workRequestFiles,
      createdAt: new Date().toISOString(),
      status: selectedCustomer ? 'assigned' : 'ready',
      customerId: selectedCustomer || undefined,
      customerName: selectedCustomer 
        ? customers.find(c => c.id === selectedCustomer)?.name 
        : 'Not Assigned',
      trackingCode
    };

    setWorkRequests(prev => [newRequest, ...prev]);
    
    // Log work request creation
    logAction(
      'Created work request',
      'creation',
      newRequest.id,
      'work_request',
      { 
        title: workRequestTitle, 
        trackingCode, 
        filesCount: workRequestFiles.length,
        customerId: selectedCustomer 
      }
    );
    
    // Reset form
    setWorkRequestTitle('');
    setWorkRequestDescription('');
    setWorkRequestFiles([]);
    setSelectedCustomer(null);
    setRecordedVideos([]);
    
    toast.success(`Work request created! Tracking: ${trackingCode}`);
  };

  const assignToCustomer = (requestId: string, customerId: string) => {
    const request = workRequests.find(r => r.id === requestId);
    if (!request) return;

    setWorkRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { 
            ...req, 
            customerId, 
            customerName: customers.find(c => c.id === customerId)?.name,
            status: 'assigned'
          }
        : req
    ));

    // Log assignment action
    logAction(
      'Assigned work request to customer',
      'assignment',
      requestId,
      'work_request',
      { 
        customerId, 
        customerName: customers.find(c => c.id === customerId)?.name,
        trackingCode: request.trackingCode 
      }
    );

    toast.success('Assigned to customer successfully!');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quote': return DollarSign;
      case 'invoice': return FileText;
      case 'user': return Users;
      case 'payment': return DollarSign;
      case 'contract': return FileText;
      case 'access': return Users;
      default: return FileText;
    }
  };

  const filteredApprovals = approvals.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const myWorkRequests = workRequests.filter(r => r.ownerId === currentOwner.id);
  const myFiles = workRequestFiles.filter(f => f.ownerId === currentOwner.id);

  return (
    <div className="space-y-6">
      {/* Owner Identity Header */}
      <div className="bg-gradient-to-r from-[#ea580c] via-[#ea580c] to-[#c2410c] rounded-xl p-4 border border-[#ea580c]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{currentOwner.name}'s Portal</h2>
              <p className="text-sm text-white/80">{currentOwner.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-white text-sm">
              {currentOwner.role.toUpperCase()} OWNER
            </div>
            {pendingCount > 0 && (
              <div className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-bold animate-pulse">
                {pendingCount} Pending
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4">
          {[
            { id: 'approvals', label: 'Approvals', icon: CheckCircle, badge: pendingCount },
            { id: 'requests', label: 'Requests', icon: Video, badge: myWorkRequests.length },
            { id: 'folders', label: 'My Folder', icon: Folder, badge: myFiles.length },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'tracking', label: 'Activity Log', icon: Activity }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as PortalTab)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white text-[#ea580c]'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-[#ea580c] text-white' : 'bg-white/20 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area - Similar to original Owner Portal but with owner tracking */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search approvals..."
                className="w-full pl-12 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Approval Items */}
          <div className="space-y-3">
            {filteredApprovals.map((item) => {
              const TypeIcon = getTypeIcon(item.type);
              return (
                <div
                  key={item.id}
                  className={`bg-[#1A1A1A] rounded-xl border p-4 transition ${
                    item.status === 'pending' 
                      ? 'border-[#ea580c]/50 hover:border-[#ea580c]' 
                      : item.status === 'approved'
                      ? 'border-green-500/30'
                      : 'border-red-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      item.status === 'pending' ? 'bg-[#ea580c]/20' :
                      item.status === 'approved' ? 'bg-green-500/20' :
                      'bg-red-500/20'
                    }`}>
                      <TypeIcon className={`w-5 h-5 ${
                        item.status === 'pending' ? 'text-[#ea580c]' :
                        item.status === 'approved' ? 'text-green-400' :
                        'text-red-400'
                      }`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{item.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getPriorityColor(item.priority)}`}>
                              {item.priority.toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              item.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {item.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-1">{item.description}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {item.requestedBy}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.requestedAt}
                            </span>
                            {item.amount && (
                              <span className="flex items-center gap-1 text-green-400 font-bold">
                                <DollarSign className="w-3 h-3" />
                                ${item.amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {item.ownerAction && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-blue-400">
                              <Shield className="w-3 h-3" />
                              Action by {item.ownerAction}
                            </div>
                          )}
                        </div>
                      </div>

                      {item.status === 'pending' && (
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleApproval(item.id, true)}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproval(item.id, false)}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                          <button className="px-4 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg text-sm font-semibold transition flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Details
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#ea580c]" />
              Your Activity Log
            </h3>
            <div className="space-y-2">
              {actionLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No actions yet. Start by approving requests or creating work orders.</p>
                </div>
              ) : (
                actionLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] hover:border-[#ea580c]/50 transition">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        log.type === 'approval' ? 'bg-green-500/20' :
                        log.type === 'video' ? 'bg-blue-500/20' :
                        log.type === 'assignment' ? 'bg-purple-500/20' :
                        log.type === 'creation' ? 'bg-orange-500/20' :
                        'bg-gray-500/20'
                      }`}>
                        {log.type === 'approval' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {log.type === 'video' && <Video className="w-4 h-4 text-blue-400" />}
                        {log.type === 'assignment' && <Link className="w-4 h-4 text-purple-400" />}
                        {log.type === 'creation' && <Plus className="w-4 h-4 text-orange-400" />}
                        {log.type === 'modification' && <Edit className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{log.action}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {log.targetType}
                          </span>
                          {log.device && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {log.device}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-2xl font-bold text-white">
                  {actionLogs.filter(l => l.type === 'approval').length}
                </span>
              </div>
              <p className="text-xs text-gray-400">Approvals</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center justify-between mb-2">
                <Video className="w-6 h-6 text-blue-400" />
                <span className="text-2xl font-bold text-white">
                  {actionLogs.filter(l => l.type === 'video').length}
                </span>
              </div>
              <p className="text-xs text-gray-400">Videos</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center justify-between mb-2">
                <Plus className="w-6 h-6 text-orange-400" />
                <span className="text-2xl font-bold text-white">
                  {actionLogs.filter(l => l.type === 'creation').length}
                </span>
              </div>
              <p className="text-xs text-gray-400">Created</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
              <div className="flex items-center justify-between mb-2">
                <Link className="w-6 h-6 text-purple-400" />
                <span className="text-2xl font-bold text-white">
                  {actionLogs.filter(l => l.type === 'assignment').length}
                </span>
              </div>
              <p className="text-xs text-gray-400">Assigned</p>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs would follow similar pattern with owner tracking */}
    </div>
  );
}
