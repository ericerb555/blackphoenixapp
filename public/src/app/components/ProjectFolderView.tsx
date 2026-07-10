/**
 * Project Folder View
 * Comprehensive project workspace accessible from all portals
 * Features: File browser, media capture, notes, dynamic checklists
 * Permission-based access control (hides contract/pricing for non-admins)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Folder, FileText, Image, Video, Camera, File, Download,
  Upload, Eye, Trash2, Plus, Check, Square, CheckSquare,
  MessageSquare, Send, User, Clock, Filter, Search, X,
  AlertCircle, CheckCircle, Calendar, Tag, Edit, Lock,
  Paperclip, ZoomIn, PlayCircle, Maximize2, ChevronRight,
  FolderOpen, Archive, Shield, Users, MapPin
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { StandardButton } from './ui/button/StandardButton';
import { TextArea } from './ui/input/TextArea';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/modal';

interface ProjectFolderViewProps {
  projectId: string;
  projectName: string;
  workOrderId?: string;
  userRole: 'admin' | 'manager' | 'employee' | 'subcontractor' | 'customer';
  userName: string;
  onClose: () => void;
}

interface ProjectFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'contract' | 'pricing';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
  thumbnail?: string;
  restricted?: boolean; // For contracts/pricing
}

interface ProjectNote {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  timestamp: string;
  attachments?: string[];
}

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  description?: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  notes?: Array<{
    id: string;
    author: string;
    content: string;
    timestamp: string;
  }>;
}

interface ProjectExpense {
  id: string;
  amount: number;
  category: string;
  description: string;
  purchasedBy: string;
  date: string;
  timestamp: string;
  receiptPhoto?: string;
  vendor?: string;
  paymentMethod?: string;
  approved: boolean;
  approvedBy?: string;
}

export default function ProjectFolderView({
  projectId,
  projectName,
  workOrderId,
  userRole,
  userName,
  onClose
}: ProjectFolderViewProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'media' | 'notes' | 'checklist' | 'expenses'>('checklist');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Files
  const [files, setFiles] = useState<ProjectFile[]>([
    {
      id: 'file-1',
      name: 'Site_Plans_v2.pdf',
      type: 'document',
      size: '2.4 MB',
      uploadedBy: 'Jennifer Kim',
      uploadedAt: 'Jan 20, 2026',
      url: '#'
    },
    {
      id: 'file-2',
      name: 'Contract_Final.pdf',
      type: 'contract',
      size: '1.2 MB',
      uploadedBy: 'Admin',
      uploadedAt: 'Jan 15, 2026',
      url: '#',
      restricted: true
    },
    {
      id: 'file-3',
      name: 'Pricing_Breakdown.xlsx',
      type: 'pricing',
      size: '856 KB',
      uploadedBy: 'Admin',
      uploadedAt: 'Jan 15, 2026',
      url: '#',
      restricted: true
    },
    {
      id: 'file-4',
      name: 'Before_Kitchen_1.jpg',
      type: 'image',
      size: '3.2 MB',
      uploadedBy: 'Alex Thompson',
      uploadedAt: 'Jan 22, 2026',
      url: '#',
      thumbnail: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=400'
    },
    {
      id: 'file-5',
      name: 'Progress_Video_Week1.mp4',
      type: 'video',
      size: '45.6 MB',
      uploadedBy: 'Mike Davis',
      uploadedAt: 'Jan 24, 2026',
      url: '#',
      thumbnail: 'https://images.unsplash.com/photo-1581858726788-75bc0f1a4eae?w=400'
    }
  ]);
  
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  
  // Checklist notes
  const [showChecklistNoteModal, setShowChecklistNoteModal] = useState(false);
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<ChecklistItem | null>(null);
  const [checklistNoteText, setChecklistNoteText] = useState('');

  // Expenses
  const [expenses, setExpenses] = useState<ProjectExpense[]>([
    {
      id: 'exp-1',
      amount: 245.50,
      category: 'Materials',
      description: 'Electrical wire and outlets',
      purchasedBy: 'John Smith',
      date: 'Jan 22, 2026',
      timestamp: 'Jan 22, 2026 10:30 AM',
      vendor: 'Home Depot',
      paymentMethod: 'Company Card',
      approved: true,
      approvedBy: 'Jennifer Kim',
      receiptPhoto: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400'
    },
    {
      id: 'exp-2',
      amount: 89.99,
      category: 'Tools',
      description: 'Power drill bits set',
      purchasedBy: 'Mike Johnson',
      date: 'Jan 23, 2026',
      timestamp: 'Jan 23, 2026 2:15 PM',
      vendor: "Lowe's",
      paymentMethod: 'Cash',
      approved: false,
      receiptPhoto: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'
    }
  ]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Materials',
    description: '',
    vendor: '',
    paymentMethod: 'Company Card'
  });
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);
  const receiptVideoRef = useRef<HTMLVideoElement>(null);
  const receiptCanvasRef = useRef<HTMLCanvasElement>(null);
  const receiptStreamRef = useRef<MediaStream | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  
  // Notes
  const [notes, setNotes] = useState<ProjectNote[]>([
    {
      id: 'note-1',
      author: 'Jennifer Kim',
      authorRole: 'Project Manager',
      content: 'Spoke with client about cabinet selection. They prefer the maple finish. Will update order by end of week.',
      timestamp: 'Jan 24, 2026 2:30 PM'
    },
    {
      id: 'note-2',
      author: 'Alex Thompson',
      authorRole: 'Senior PM',
      content: 'Electrical inspection passed! Moving forward with drywall installation. Expected completion: Friday.',
      timestamp: 'Jan 23, 2026 10:15 AM'
    },
    {
      id: 'note-3',
      author: 'Mike Davis',
      authorRole: 'Field Worker',
      content: 'Found minor water damage behind old cabinets. Took photos and created change order. Needs approval before proceeding.',
      timestamp: 'Jan 22, 2026 3:45 PM'
    }
  ]);
  
  const [newNote, setNewNote] = useState('');
  
  // Checklist (generated from quote/scope of work)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    {
      id: 'check-1',
      category: 'Demolition',
      task: 'Remove existing cabinets',
      description: 'Safely remove and dispose of old kitchen cabinets',
      completed: true,
      completedBy: 'Mike Davis',
      completedAt: 'Jan 20, 2026',
      priority: 'high',
      estimatedHours: 4
    },
    {
      id: 'check-2',
      category: 'Demolition',
      task: 'Remove countertops',
      description: 'Remove old granite countertops',
      completed: true,
      completedBy: 'Mike Davis',
      completedAt: 'Jan 20, 2026',
      priority: 'high',
      estimatedHours: 2
    },
    {
      id: 'check-3',
      category: 'Electrical',
      task: 'Install new outlets',
      description: 'Add 4 new GFCI outlets for kitchen appliances',
      completed: true,
      completedBy: 'John Smith',
      completedAt: 'Jan 22, 2026',
      assignedTo: 'John Smith',
      priority: 'high',
      estimatedHours: 6,
      notes: [
        {
          id: 'note-check-3-1',
          author: 'John Smith',
          content: 'All outlets installed and tested. GFCI protection working correctly.',
          timestamp: 'Jan 22, 2026 3:45 PM'
        },
        {
          id: 'note-check-3-2',
          author: 'Alex Thompson',
          content: 'Inspected work - looks great! Ready for next phase.',
          timestamp: 'Jan 22, 2026 4:15 PM'
        }
      ]
    },
    {
      id: 'check-4',
      category: 'Electrical',
      task: 'Install under-cabinet lighting',
      description: 'LED strip lighting installation',
      completed: false,
      assignedTo: 'John Smith',
      priority: 'medium',
      estimatedHours: 3
    },
    {
      id: 'check-5',
      category: 'Plumbing',
      task: 'Install new sink and faucet',
      description: 'Undermount sink with pull-down faucet',
      completed: false,
      assignedTo: 'David Lee',
      priority: 'high',
      estimatedHours: 4,
      notes: [
        {
          id: 'note-check-5-1',
          author: 'David Lee',
          content: 'Sink arrived today. Will start installation tomorrow morning.',
          timestamp: 'Jan 23, 2026 2:30 PM'
        }
      ]
    },
    {
      id: 'check-6',
      category: 'Plumbing',
      task: 'Install dishwasher connection',
      description: 'Water line and drain connection for new dishwasher',
      completed: false,
      assignedTo: 'David Lee',
      priority: 'medium',
      estimatedHours: 2
    },
    {
      id: 'check-7',
      category: 'Cabinetry',
      task: 'Install base cabinets',
      description: 'Install and level all base cabinets',
      completed: false,
      assignedTo: 'Alex Thompson',
      priority: 'high',
      estimatedHours: 8
    },
    {
      id: 'check-8',
      category: 'Cabinetry',
      task: 'Install wall cabinets',
      description: 'Install and secure wall-mounted cabinets',
      completed: false,
      assignedTo: 'Alex Thompson',
      priority: 'high',
      estimatedHours: 6
    },
    {
      id: 'check-9',
      category: 'Countertops',
      task: 'Template countertops',
      description: 'Create template for quartz countertops',
      completed: false,
      assignedTo: 'Subcontractor',
      priority: 'medium',
      estimatedHours: 2
    },
    {
      id: 'check-10',
      category: 'Countertops',
      task: 'Install countertops',
      description: 'Install and seal quartz countertops',
      completed: false,
      assignedTo: 'Subcontractor',
      priority: 'high',
      estimatedHours: 4
    },
    {
      id: 'check-11',
      category: 'Finishing',
      task: 'Install backsplash',
      description: 'Tile backsplash installation',
      completed: false,
      priority: 'medium',
      estimatedHours: 6
    },
    {
      id: 'check-12',
      category: 'Finishing',
      task: 'Paint walls',
      description: 'Prime and paint kitchen walls',
      completed: false,
      priority: 'low',
      estimatedHours: 4
    },
    {
      id: 'check-13',
      category: 'Final',
      task: 'Install appliances',
      description: 'Connect and test all kitchen appliances',
      completed: false,
      priority: 'high',
      estimatedHours: 3
    },
    {
      id: 'check-14',
      category: 'Final',
      task: 'Final walkthrough',
      description: 'Complete inspection with client',
      completed: false,
      priority: 'high',
      estimatedHours: 1
    }
  ]);

  // Permission check
  const canViewFile = (file: ProjectFile): boolean => {
    if (!file.restricted) return true;
    return userRole === 'admin' || userRole === 'manager';
  };

  const filteredFiles = files.filter(file => {
    if (!canViewFile(file)) return false;
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredNotes = notes.filter(note => {
    if (searchQuery && !note.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredChecklistItems = checklistItems.filter(item => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (searchQuery && !item.task.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const categories = ['all', ...Array.from(new Set(checklistItems.map(item => item.category)))];

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklistItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? {
              ...item,
              completed: !item.completed,
              completedBy: !item.completed ? userName : undefined,
              completedAt: !item.completed ? new Date().toLocaleDateString() : undefined
            }
          : item
      )
    );
    const item = checklistItems.find(i => i.id === itemId);
    if (item) {
      toast.success(
        item.completed
          ? `"${item.task}" marked as incomplete`
          : `"${item.task}" marked as complete!`
      );
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    const note: ProjectNote = {
      id: `note-${Date.now()}`,
      author: userName,
      authorRole: userRole.charAt(0).toUpperCase() + userRole.slice(1),
      content: newNote,
      timestamp: new Date().toLocaleString()
    };

    setNotes([note, ...notes]);
    setNewNote('');
    toast.success('Note added successfully!');
  };

  const handleAddChecklistNote = () => {
    if (!checklistNoteText.trim()) {
      toast.error('Please enter a note');
      return;
    }

    if (!selectedChecklistItem) return;

    const newChecklistNote = {
      id: `note-${selectedChecklistItem.id}-${Date.now()}`,
      author: userName,
      content: checklistNoteText,
      timestamp: new Date().toLocaleString()
    };

    setChecklistItems(prevItems =>
      prevItems.map(item =>
        item.id === selectedChecklistItem.id
          ? {
              ...item,
              notes: [...(item.notes || []), newChecklistNote]
            }
          : item
      )
    );

    setChecklistNoteText('');
    setShowChecklistNoteModal(false);
    setSelectedChecklistItem(null);
    toast.success('Note added to checklist item!');
  };

  const handleOpenChecklistNoteModal = (item: ChecklistItem) => {
    setSelectedChecklistItem(item);
    setShowChecklistNoteModal(true);
  };

  // Expense handlers
  const handleAddExpense = () => {
    if (!newExpense.amount || !newExpense.description) {
      toast.error('Please enter amount and description');
      return;
    }

    if (!receiptPhoto) {
      toast.error('Please add a receipt photo');
      return;
    }

    const expense: ProjectExpense = {
      id: `exp-${Date.now()}`,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      description: newExpense.description,
      purchasedBy: userName,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
      vendor: newExpense.vendor,
      paymentMethod: newExpense.paymentMethod,
      approved: false,
      receiptPhoto: receiptPhoto
    };

    setExpenses([expense, ...expenses]);
    setNewExpense({
      amount: '',
      category: 'Materials',
      description: '',
      vendor: '',
      paymentMethod: 'Company Card'
    });
    setReceiptPhoto(null);
    setShowAddExpenseModal(false);
    toast.success('Expense added successfully! Pending admin approval.');
  };

  const handleStartReceiptCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (receiptVideoRef.current) {
        receiptVideoRef.current.srcObject = stream;
        receiptStreamRef.current = stream;
      }
      setShowReceiptCamera(true);
    } catch (error) {
      toast.error('Could not access camera');
      console.error('Camera error:', error);
    }
  };

  const handleCaptureReceipt = () => {
    if (receiptVideoRef.current && receiptCanvasRef.current) {
      const video = receiptVideoRef.current;
      const canvas = receiptCanvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg');
        setReceiptPhoto(photoData);
        handleStopReceiptCamera();
        toast.success('Receipt photo captured!');
      }
    }
  };

  const handleStopReceiptCamera = () => {
    if (receiptStreamRef.current) {
      receiptStreamRef.current.getTracks().forEach(track => track.stop());
      receiptStreamRef.current = null;
    }
    setShowReceiptCamera(false);
  };

  const handleReceiptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReceiptPhoto(event.target?.result as string);
        toast.success('Receipt photo uploaded!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApproveExpense = (expenseId: string) => {
    setExpenses(prevExpenses =>
      prevExpenses.map(exp =>
        exp.id === expenseId
          ? { ...exp, approved: true, approvedBy: userName }
          : exp
      )
    );
    toast.success('Expense approved!');
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const calculateApprovedExpenses = () => {
    return expenses.filter(exp => exp.approved).reduce((sum, exp) => sum + exp.amount, 0);
  };

  const calculatePendingExpenses = () => {
    return expenses.filter(exp => !exp.approved).reduce((sum, exp) => sum + exp.amount, 0);
  };

  const handleFileUpload = () => {
    toast.success('File upload feature coming soon!');
    setShowUploadModal(false);
  };

  const handleMediaCapture = () => {
    toast.success('Opening camera...');
    setShowCaptureModal(false);
  };

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  const getFileIcon = (type: ProjectFile['type']) => {
    switch (type) {
      case 'image':
        return Image;
      case 'video':
        return Video;
      case 'contract':
      case 'pricing':
        return FileText;
      default:
        return File;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl border border-orange-500/30 w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {projectName}
                {workOrderId && (
                  <span className="text-sm font-medium text-gray-400">• {workOrderId}</span>
                )}
              </h2>
              <p className="text-sm text-gray-400 mt-1">Project Folder & Workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#2A2A2A] overflow-x-auto">
          {[
            { id: 'checklist', label: 'Checklist', icon: CheckSquare, badge: `${completedCount}/${totalCount}` },
            { id: 'expenses', label: 'Expenses', icon: Tag, badge: `$${calculateTotalExpenses().toFixed(0)}`, color: expenses.some(e => !e.approved) ? 'orange' : 'green' },
            { id: 'files', label: 'Files', icon: Folder, badge: filteredFiles.length },
            { id: 'media', label: 'Media', icon: Camera, badge: files.filter(f => f.type === 'image' || f.type === 'video').length },
            { id: 'notes', label: 'Notes', icon: MessageSquare, badge: notes.length }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.id
                    ? 'bg-white/20'
                    : 'bg-[#2A2A2A]'
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search and Actions Bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#2A2A2A]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-11 pr-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          {activeTab === 'checklist' && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          )}

          {(activeTab === 'files' || activeTab === 'media') && (
            <>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-medium transition"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <button
                onClick={() => setShowCaptureModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition"
              >
                <Camera className="w-4 h-4" />
                Capture
              </button>
            </>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <div className="space-y-6">
              {/* Progress Overview */}
              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Project Progress</h3>
                    <p className="text-sm text-gray-300">Based on completed checklist items</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-orange-400">{completionPercentage}%</div>
                    <div className="text-sm text-gray-400">{completedCount} of {totalCount} complete</div>
                  </div>
                </div>
                <div className="w-full h-3 bg-[#0F0F0F] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-600 to-orange-700 transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-4">
                {filteredChecklistItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-5 rounded-xl border transition ${
                      item.completed
                        ? 'bg-green-600/10 border-green-500/30'
                        : 'bg-[#0F0F0F] border-[#2A2A2A] hover:border-orange-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleToggleChecklistItem(item.id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {item.completed ? (
                          <CheckSquare className="w-6 h-6 text-green-400" />
                        ) : (
                          <Square className="w-6 h-6 text-gray-400 hover:text-orange-400 transition" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                item.completed
                                  ? 'bg-green-600/20 text-green-400'
                                  : 'bg-blue-600/20 text-blue-400'
                              }`}>
                                {item.category}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                item.priority === 'high'
                                  ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                                  : item.priority === 'medium'
                                  ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                                  : 'bg-gray-600/20 text-gray-400'
                              }`}>
                                {item.priority.toUpperCase()}
                              </span>
                              {item.estimatedHours && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {item.estimatedHours}h
                                </span>
                              )}
                              {item.notes && item.notes.length > 0 && (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {item.notes.length}
                                </span>
                              )}
                            </div>
                            <h4 className={`font-bold mb-1 ${
                              item.completed ? 'text-gray-400 line-through' : 'text-white'
                            }`}>
                              {item.task}
                            </h4>
                            {item.description && (
                              <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {item.assignedTo && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  Assigned: {item.assignedTo}
                                </span>
                              )}
                              {item.completed && item.completedBy && (
                                <span className="flex items-center gap-1 text-green-400">
                                  <CheckCircle className="w-3 h-3" />
                                  Completed by {item.completedBy} on {item.completedAt}
                                </span>
                              )}
                            </div>

                            {/* Display existing notes */}
                            {item.notes && item.notes.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {item.notes.map(note => (
                                  <div
                                    key={note.id}
                                    className="p-3 bg-[#1A1A1A] rounded-lg border border-purple-500/20"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-bold text-purple-400">{note.author}</span>
                                      <span className="text-xs text-gray-500">{note.timestamp}</span>
                                    </div>
                                    <p className="text-sm text-gray-300">{note.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add Note Button */}
                            <button
                              onClick={() => handleOpenChecklistNoteModal(item)}
                              className="mt-3 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-medium transition flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Add Note
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredChecklistItems.length === 0 && (
                <div className="text-center py-12">
                  <CheckSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No checklist items found</p>
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map(file => {
                const Icon = getFileIcon(file.type);
                const canView = canViewFile(file);
                
                return (
                  <div
                    key={file.id}
                    className={`p-5 rounded-xl border transition ${
                      canView
                        ? 'bg-[#0F0F0F] border-[#2A2A2A] hover:border-orange-500/30 cursor-pointer'
                        : 'bg-[#0F0F0F] border-red-500/30 opacity-50'
                    }`}
                    onClick={() => {
                      if (canView) {
                        setSelectedFile(file);
                        setShowFilePreview(true);
                      } else {
                        toast.error('Access denied: Admin/Manager only');
                      }
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        file.type === 'image' || file.type === 'video'
                          ? 'bg-blue-600/20 border border-blue-500/30'
                          : file.restricted
                          ? 'bg-red-600/20 border border-red-500/30'
                          : 'bg-orange-600/20 border border-orange-500/30'
                      }`}>
                        {canView ? (
                          <Icon className={`w-6 h-6 ${
                            file.type === 'image' || file.type === 'video'
                              ? 'text-blue-400'
                              : file.restricted
                              ? 'text-red-400'
                              : 'text-orange-400'
                          }`} />
                        ) : (
                          <Lock className="w-6 h-6 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white truncate mb-1">{file.name}</h4>
                        <p className="text-xs text-gray-500">{file.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{file.uploadedBy}</span>
                      <span>{file.uploadedAt}</span>
                    </div>
                    {file.restricted && !canView && (
                      <div className="mt-3 p-2 bg-red-600/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-red-400 font-medium">Restricted Access</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFiles.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No files found</p>
                </div>
              )}
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles
                .filter(f => f.type === 'image' || f.type === 'video')
                .map(file => (
                  <div
                    key={file.id}
                    className="relative group cursor-pointer rounded-xl overflow-hidden bg-[#0F0F0F] border border-[#2A2A2A] hover:border-orange-500/30 transition"
                    onClick={() => {
                      setSelectedFile(file);
                      setShowFilePreview(true);
                    }}
                  >
                    <div className="aspect-video relative">
                      {file.thumbnail && (
                        <img
                          src={file.thumbnail}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {file.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <PlayCircle className="w-12 h-12 text-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end">
                        <div className="p-4 w-full">
                          <p className="text-white font-bold text-sm mb-1">{file.name}</p>
                          <div className="flex items-center justify-between text-xs text-gray-300">
                            <span>{file.uploadedBy}</span>
                            <span>{file.uploadedAt}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {filteredFiles.filter(f => f.type === 'image' || f.type === 'video').length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No media files yet</p>
                  <button
                    onClick={() => setShowCaptureModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition inline-flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Photos/Videos
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {/* Cost Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-400">Approved</span>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">${calculateApprovedExpenses().toFixed(2)}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-400">Pending</span>
                    <Clock className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">${calculatePendingExpenses().toFixed(2)}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-400">Total</span>
                    <Tag className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">${calculateTotalExpenses().toFixed(2)}</div>
                </div>
              </div>

              {/* Add Expense Button */}
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-5 h-5" />
                Add New Expense
              </button>

              {/* Expenses List */}
              <div className="space-y-4">
                {expenses.map(expense => (
                  <div
                    key={expense.id}
                    className={`bg-[#0F0F0F] rounded-xl border p-5 transition ${
                      expense.approved
                        ? 'border-green-500/30 hover:border-green-500/50'
                        : 'border-orange-500/30 hover:border-orange-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Receipt Thumbnail */}
                      {expense.receiptPhoto && (
                        <button
                          onClick={() => {
                            setSelectedReceipt(expense.receiptPhoto!);
                            setShowReceiptPreview(true);
                          }}
                          className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-80 transition border-2 border-orange-500/30 hover:border-orange-500"
                        >
                          <img
                            src={expense.receiptPhoto}
                            alt="Receipt"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      )}

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl font-bold text-white">${expense.amount.toFixed(2)}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                expense.approved
                                  ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                  : 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                              }`}>
                                {expense.approved ? 'APPROVED' : 'PENDING'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600/20 text-blue-400">
                                {expense.category}
                              </span>
                            </div>
                            <p className="text-white font-medium mb-1">{expense.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {expense.purchasedBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {expense.date}
                              </span>
                              {expense.vendor && (
                                <span className="flex items-center gap-1">
                                  <Tag className="w-4 h-4" />
                                  {expense.vendor}
                                </span>
                              )}
                              {expense.paymentMethod && (
                                <span className="px-2 py-0.5 rounded bg-gray-700/50 text-gray-300 text-xs">
                                  {expense.paymentMethod}
                                </span>
                              )}
                            </div>
                            {expense.approved && expense.approvedBy && (
                              <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Approved by {expense.approvedBy}
                              </p>
                            )}
                          </div>
                          {!expense.approved && (userRole === 'admin' || userRole === 'manager') && (
                            <button
                              onClick={() => handleApproveExpense(expense.id)}
                              className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 font-medium transition flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {expenses.length === 0 && (
                <div className="text-center py-12">
                  <Tag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No expenses recorded yet</p>
                  <p className="text-sm text-gray-500 mt-2">Click "Add New Expense" to record spending</p>
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Add Note Form */}
              <div className="bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-orange-400" />
                  Add Note
                </h3>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a note about this project..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none mb-4"
                />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <User className="w-4 h-4 inline mr-1" />
                    Posting as: <span className="font-medium text-white">{userName}</span>
                  </div>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Post Note
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {filteredNotes.map(note => (
                  <div
                    key={note.id}
                    className="bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] p-5 hover:border-orange-500/30 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {note.author.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white">{note.author}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-600/20 text-orange-400">
                            {note.authorRole}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {note.timestamp}
                        </p>
                        <p className="text-gray-300">{note.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredNotes.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No notes yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t border-[#2A2A2A] px-6 py-4 bg-[#0F0F0F]">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-orange-400">{completionPercentage}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">${calculateApprovedExpenses().toFixed(0)}</div>
              <div className="text-xs text-gray-500">Approved Costs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{files.length}</div>
              <div className="text-xs text-gray-500">Total Files</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{files.filter(f => f.type === 'image' || f.type === 'video').length}</div>
              <div className="text-xs text-gray-500">Media Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{notes.length}</div>
              <div className="text-xs text-gray-500">Notes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-orange-500/30 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Upload className="w-6 h-6 text-orange-400" />
                Upload File
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-8 text-center hover:border-orange-500/50 transition cursor-pointer">
              <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-500">PDF, images, videos, and documents</p>
            </div>
          </div>
        </div>
      )}

      {/* Capture Modal */}
      {showCaptureModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-orange-500/30 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Camera className="w-6 h-6 text-orange-400" />
                Capture Media
              </h3>
              <button
                onClick={() => setShowCaptureModal(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <button
                onClick={handleMediaCapture}
                className="w-full p-6 bg-[#0F0F0F] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-left transition group"
              >
                <Camera className="w-10 h-10 text-blue-400 mb-3 group-hover:scale-110 transition" />
                <h4 className="text-white font-bold mb-1">Take Photo</h4>
                <p className="text-sm text-gray-400">Capture a photo with your device camera</p>
              </button>
              <button
                onClick={handleMediaCapture}
                className="w-full p-6 bg-[#0F0F0F] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-left transition group"
              >
                <Video className="w-10 h-10 text-green-400 mb-3 group-hover:scale-110 transition" />
                <h4 className="text-white font-bold mb-1">Record Video</h4>
                <p className="text-sm text-gray-400">Record a video with your device camera</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showFilePreview && selectedFile && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-orange-500/30 max-w-4xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedFile.name}</h3>
                <p className="text-sm text-gray-400">
                  Uploaded by {selectedFile.uploadedBy} • {selectedFile.uploadedAt}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFilePreview(false);
                  setSelectedFile(null);
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="bg-[#0F0F0F] rounded-xl p-8 text-center">
              {selectedFile.type === 'image' && selectedFile.thumbnail && (
                <img
                  src={selectedFile.thumbnail}
                  alt={selectedFile.name}
                  className="max-w-full max-h-[60vh] mx-auto rounded-lg"
                />
              )}
              {selectedFile.type === 'video' && (
                <div className="flex items-center justify-center h-[60vh]">
                  <PlayCircle className="w-24 h-24 text-gray-600" />
                </div>
              )}
              {(selectedFile.type === 'document' || selectedFile.type === 'contract' || selectedFile.type === 'pricing') && (
                <div className="flex flex-col items-center justify-center h-[60vh]">
                  <FileText className="w-24 h-24 text-gray-600 mb-4" />
                  <p className="text-gray-400 mb-6">Preview not available</p>
                  <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition inline-flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl border border-orange-500/30 max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Tag className="w-6 h-6 text-orange-400" />
                Add New Expense
              </h3>
              <button
                onClick={() => {
                  setShowAddExpenseModal(false);
                  setNewExpense({
                    amount: '',
                    category: 'Materials',
                    description: '',
                    vendor: '',
                    paymentMethod: 'Company Card'
                  });
                  setReceiptPhoto(null);
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white text-lg font-bold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Category *
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="Materials">Materials</option>
                  <option value="Tools">Tools</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Labor">Labor</option>
                  <option value="Permits">Permits</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Description *
                </label>
                <textarea
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="What was purchased?"
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                />
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Vendor / Store
                </label>
                <input
                  type="text"
                  value={newExpense.vendor}
                  onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                  placeholder="e.g., Home Depot, Lowe's"
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Payment Method
                </label>
                <select
                  value={newExpense.paymentMethod}
                  onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="Company Card">Company Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Personal Card (Reimbursement)">Personal Card (Reimbursement)</option>
                  <option value="Check">Check</option>
                </select>
              </div>

              {/* Receipt Photo */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Receipt Photo * <span className="text-orange-400">(Required)</span>
                </label>
                
                {!receiptPhoto ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleStartReceiptCamera}
                      className="p-6 bg-[#0F0F0F] border-2 border-dashed border-orange-500/30 hover:border-orange-500 rounded-xl transition flex flex-col items-center gap-2"
                    >
                      <Camera className="w-8 h-8 text-orange-400" />
                      <span className="text-white font-medium">Take Photo</span>
                    </button>
                    <label className="p-6 bg-[#0F0F0F] border-2 border-dashed border-orange-500/30 hover:border-orange-500 rounded-xl transition flex flex-col items-center gap-2 cursor-pointer">
                      <Upload className="w-8 h-8 text-orange-400" />
                      <span className="text-white font-medium">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={receiptPhoto}
                      alt="Receipt"
                      className="w-full h-48 object-cover rounded-xl border-2 border-green-500/30"
                    />
                    <button
                      onClick={() => setReceiptPhoto(null)}
                      className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-bold mb-1">Important: Expenses must be recorded immediately</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-400">
                      <li>All receipts require a photo for verification</li>
                      <li>Expenses are pending until approved by admin/manager</li>
                      <li>Costs are tracked against the work order budget</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddExpenseModal(false);
                    setNewExpense({
                      amount: '',
                      category: 'Materials',
                      description: '',
                      vendor: '',
                      paymentMethod: 'Company Card'
                    });
                    setReceiptPhoto(null);
                  }}
                  className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExpense}
                  disabled={!newExpense.amount || !newExpense.description || !receiptPhoto}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Camera Modal */}
      {showReceiptCamera && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-[#1A1A1A] rounded-2xl border border-orange-500/30 overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-orange-400" />
                  Capture Receipt
                </h3>
                <button
                  onClick={handleStopReceiptCamera}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="relative bg-black">
                <video
                  ref={receiptVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                />
                <canvas ref={receiptCanvasRef} className="hidden" />
              </div>
              <div className="p-4 flex justify-center gap-3">
                <button
                  onClick={handleStopReceiptCamera}
                  className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCaptureReceipt}
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl text-white font-bold transition flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Capture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && selectedReceipt && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="max-w-4xl w-full">
            <div className="bg-[#1A1A1A] rounded-2xl border border-orange-500/30 overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Receipt Photo</h3>
                <button
                  onClick={() => {
                    setShowReceiptPreview(false);
                    setSelectedReceipt(null);
                  }}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-6 bg-[#0F0F0F]">
                <img
                  src={selectedReceipt}
                  alt="Receipt"
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Note Modal */}
      {showChecklistNoteModal && selectedChecklistItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-2xl border border-purple-500/30 max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                  Add Note to Task
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600/20 text-blue-400">
                    {selectedChecklistItem.category}
                  </span>
                  <span className="text-sm text-gray-400">{selectedChecklistItem.task}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChecklistNoteModal(false);
                  setSelectedChecklistItem(null);
                  setChecklistNoteText('');
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition flex-shrink-0"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Existing Notes */}
            {selectedChecklistItem.notes && selectedChecklistItem.notes.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  Previous Notes ({selectedChecklistItem.notes.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedChecklistItem.notes.map(note => (
                    <div
                      key={note.id}
                      className="p-3 bg-[#0F0F0F] rounded-lg border border-purple-500/20"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-purple-400">{note.author}</span>
                        <span className="text-xs text-gray-500">{note.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-300">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Note */}
            <div className="bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] p-4">
              <label className="block text-sm font-bold text-white mb-3">
                Add Your Note
              </label>
              <textarea
                value={checklistNoteText}
                onChange={(e) => setChecklistNoteText(e.target.value)}
                placeholder="Document progress, issues, or important details about this task..."
                rows={4}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none mb-4"
              />
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  <User className="w-4 h-4 inline mr-1" />
                  Posting as: <span className="font-medium text-white">{userName}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowChecklistNoteModal(false);
                      setSelectedChecklistItem(null);
                      setChecklistNoteText('');
                    }}
                    className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddChecklistNote}
                    disabled={!checklistNoteText.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Add Note
                  </button>
                </div>
              </div>
            </div>

            {/* Task Info */}
            <div className="mt-4 p-4 bg-blue-600/10 rounded-xl border border-blue-500/30">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedChecklistItem.assignedTo && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-500">Assigned:</span>
                    <span className="font-medium text-white">{selectedChecklistItem.assignedTo}</span>
                  </div>
                )}
                {selectedChecklistItem.estimatedHours && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-500">Estimated:</span>
                    <span className="font-medium text-white">{selectedChecklistItem.estimatedHours}h</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-300">
                  <Tag className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-500">Priority:</span>
                  <span className={`font-medium ${
                    selectedChecklistItem.priority === 'high'
                      ? 'text-red-400'
                      : selectedChecklistItem.priority === 'medium'
                      ? 'text-orange-400'
                      : 'text-gray-400'
                  }`}>
                    {selectedChecklistItem.priority.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${selectedChecklistItem.completed ? 'text-green-400' : 'text-yellow-400'}`}>
                    {selectedChecklistItem.completed ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
