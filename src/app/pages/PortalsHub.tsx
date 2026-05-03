import { useState } from 'react';
import {
  Users, Store, Megaphone, Wrench, Briefcase, Home, Building2,
  Key, TrendingUp, Layout, Monitor, ArrowLeft, Sparkles,
  Plus, Trash2, Edit3, Eye, Settings, ChevronRight, Save, X,
  Brain, Zap, MessageSquare, Send, Loader2, Sliders, Smartphone,
  Bell, MapPin, Camera, WifiOff, Lock, Video, FileText, Globe
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import PortalGlobalSettings from './PortalGlobalSettings';

// Import all portal view components
import VendorPortalView from '../components/portals/VendorPortalView';
import CustomerPortalView from '../components/portals/CustomerPortalView';
import AdvertiserPortalView from '../components/portals/AdvertiserPortalView';
import CondoAssociationPortalView from '../components/portals/CondoAssociationPortalView';
import LandlordPortalView from '../components/portals/LandlordPortalView';
import InvestorPortalView from '../components/portals/InvestorPortalView';
import MobileOwnerPortalView from '../components/portals/MobileOwnerPortalView';
import OnCallEmergencyPortal from '../components/portals/OnCallEmergencyPortal';
import EmployeePortalView from '../components/portals/EmployeePortalView';

// Available portal components
const PORTAL_COMPONENTS = {
  CustomerPortalView,
  VendorPortalView,
  AdvertiserPortalView,
  CondoAssociationPortalView,
  LandlordPortalView,
  InvestorPortalView,
  MobileOwnerPortalView,
  OnCallEmergencyPortal,
  EmployeePortalView,
};

// Icon options
const ICON_OPTIONS = [
  { name: 'Users', component: Users },
  { name: 'Store', component: Store },
  { name: 'Megaphone', component: Megaphone },
  { name: 'Wrench', component: Wrench },
  { name: 'Briefcase', component: Briefcase },
  { name: 'Home', component: Home },
  { name: 'Building2', component: Building2 },
  { name: 'Key', component: Key },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'Layout', component: Layout },
];

// Color options
const COLOR_OPTIONS = [
  { name: 'orange', label: 'Orange', class: 'text-orange-400', gradient: 'from-orange-500/20' },
  { name: 'blue', label: 'Blue', class: 'text-blue-400', gradient: 'from-blue-500/20' },
  { name: 'green', label: 'Green', class: 'text-green-400', gradient: 'from-green-500/20' },
  { name: 'purple', label: 'Purple', class: 'text-purple-400', gradient: 'from-purple-500/20' },
  { name: 'pink', label: 'Pink', class: 'text-pink-400', gradient: 'from-pink-500/20' },
  { name: 'yellow', label: 'Yellow', class: 'text-yellow-400', gradient: 'from-yellow-500/20' },
  { name: 'red', label: 'Red', class: 'text-red-400', gradient: 'from-red-500/20' },
  { name: 'indigo', label: 'Indigo', class: 'text-indigo-400', gradient: 'from-indigo-500/20' },
  { name: 'emerald', label: 'Emerald', class: 'text-emerald-400', gradient: 'from-emerald-500/20' },
  { name: 'cyan', label: 'Cyan', class: 'text-cyan-400', gradient: 'from-cyan-500/20' },
];

interface Portal {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: string;
  color: string;
  enabled: boolean;
  mobileFeatures?: {
    pushNotifications: boolean;
    gpsTracking: boolean;
    cameraAccess: boolean;
    offlineMode: boolean;
    biometricAuth: boolean;
    inAppMessaging: boolean;
    documentScanning: boolean;
    videoCall: boolean;
  };
}

// Default portals
const DEFAULT_PORTALS: Portal[] = [
  {
    id: 'customer',
    name: 'Customer Portal',
    description: 'For property owners and clients',
    icon: 'Users',
    component: 'CustomerPortalView',
    color: 'orange',
    enabled: true
  },
  {
    id: 'vendor',
    name: 'Vendor Portal',
    description: 'For suppliers and vendors',
    icon: 'Store',
    component: 'VendorPortalView',
    color: 'blue',
    enabled: true
  },
  {
    id: 'advertiser',
    name: 'Advertiser Portal',
    description: 'For marketing and advertising',
    icon: 'Megaphone',
    component: 'AdvertiserPortalView',
    color: 'purple',
    enabled: true
  },
  {
    id: 'subcontractor',
    name: 'Subcontractor Portal',
    description: 'For subcontractors and workers',
    icon: 'Wrench',
    component: 'OnCallEmergencyPortal',
    color: 'yellow',
    enabled: true
  },
  {
    id: 'employee',
    name: 'Employee Portal',
    description: 'For internal staff members',
    icon: 'Briefcase',
    component: 'EmployeePortalView',
    color: 'green',
    enabled: true
  },
  {
    id: 'owner',
    name: 'Property Owner Portal',
    description: 'For property owners',
    icon: 'Home',
    component: 'MobileOwnerPortalView',
    color: 'indigo',
    enabled: true
  },
  {
    id: 'property-manager',
    name: 'Property Manager Portal',
    description: 'For property management',
    icon: 'Building2',
    component: 'LandlordPortalView',
    color: 'pink',
    enabled: true
  },
  {
    id: 'landlord',
    name: 'Landlord Portal',
    description: 'For landlords and rental owners',
    icon: 'Key',
    component: 'LandlordPortalView',
    color: 'red',
    enabled: true
  },
  {
    id: 'investor',
    name: 'Investor Portal',
    description: 'For investors and stakeholders',
    icon: 'TrendingUp',
    component: 'InvestorPortalView',
    color: 'emerald',
    enabled: true
  },
  {
    id: 'condo',
    name: 'Condo Association Portal',
    description: 'For condo associations',
    icon: 'Layout',
    component: 'CondoAssociationPortalView',
    color: 'cyan',
    enabled: true
  }
];

export default function PortalsHub() {
  const [view, setView] = useState<'grid' | 'preview' | 'edit' | 'create' | 'global-settings'>('grid');
  const [portals, setPortals] = useState<Portal[]>(() => {
    const saved = localStorage.getItem('portals_hub_config');
    return saved ? JSON.parse(saved) : DEFAULT_PORTALS;
  });
  const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null);
  const [editingPortal, setEditingPortal] = useState<Portal | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Save portals to localStorage whenever they change
  const savePortals = (updatedPortals: Portal[]) => {
    setPortals(updatedPortals);
    localStorage.setItem('portals_hub_config', JSON.stringify(updatedPortals));
  };

  const handleCreatePortal = () => {
    const newPortal: Portal = {
      id: `portal-${Date.now()}`,
      name: 'New Portal',
      description: 'Portal description',
      icon: 'Users',
      component: 'CustomerPortalView',
      color: 'orange',
      enabled: true
    };
    setEditingPortal(newPortal);
    setView('create');
  };

  const handleEditPortal = (portal: Portal) => {
    setEditingPortal({ ...portal });
    setView('edit');
  };

  const handleDeletePortal = (portalId: string) => {
    if (confirm('Are you sure you want to delete this portal?')) {
      const updated = portals.filter(p => p.id !== portalId);
      savePortals(updated);
      toast.success('Portal deleted successfully');
    }
  };

  const handleSavePortal = () => {
    if (!editingPortal) return;

    if (view === 'create') {
      const updated = [...portals, editingPortal];
      savePortals(updated);
      toast.success('Portal created successfully');
    } else {
      const updated = portals.map(p => p.id === editingPortal.id ? editingPortal : p);
      savePortals(updated);
      toast.success('Portal updated successfully');
    }
    setEditingPortal(null);
    setView('grid');
  };

  const handleViewPortal = (portal: Portal) => {
    setSelectedPortal(portal);
    setView('preview');
  };

  const getIconComponent = (iconName: string) => {
    const icon = ICON_OPTIONS.find(i => i.name === iconName);
    return icon?.component || Users;
  };

  const getColorClass = (color: string) => {
    const colorOption = COLOR_OPTIONS.find(c => c.name === color);
    return colorOption?.class || 'text-orange-400';
  };

  const getGlowClass = (color: string) => {
    const colorOption = COLOR_OPTIONS.find(c => c.name === color);
    return colorOption?.gradient || 'from-orange-500/20';
  };

  // Render portal preview
  if (view === 'preview' && selectedPortal) {
    const PortalComponent = PORTAL_COMPONENTS[selectedPortal.component as keyof typeof PORTAL_COMPONENTS];
    const IconComponent = getIconComponent(selectedPortal.icon);
    
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        {/* Header with back button */}
        <div className="sticky top-0 z-50 bg-[#0F0F0F] border-b border-[#2A2A2A]">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSelectedPortal(null);
                    setView('grid');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:border-orange-500/50 hover:bg-[#1A1A1A]/80 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Portals Hub</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${selectedPortal.color}-500/10 to-${selectedPortal.color}-600/5 flex items-center justify-center`}>
                    <IconComponent className={`w-5 h-5 ${getColorClass(selectedPortal.color)}`} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">{selectedPortal.name}</h1>
                    <p className="text-sm text-gray-400">{selectedPortal.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-600/20 border border-orange-500/50 rounded-lg">
                <Monitor className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold text-orange-300">PREVIEW MODE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Portal content */}
        {PortalComponent && <PortalComponent />}
      </div>
    );
  }

  // Render edit/create form
  if ((view === 'edit' || view === 'create') && editingPortal) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex">
        {/* Main Content */}
        <div className="flex-1">
          <div className="sticky top-0 z-50 bg-[#0F0F0F] border-b border-[#2A2A2A] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setEditingPortal(null);
                    setShowAIAssistant(false);
                    setAiMessages([]);
                    setView('grid');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:border-orange-500/50 transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <h1 className="text-xl font-bold text-white">
                  {view === 'create' ? 'Create New Portal' : 'Edit Portal'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {view === 'create' && (
                  <button
                    onClick={() => {
                      setShowAIAssistant(!showAIAssistant);
                      if (!showAIAssistant && aiMessages.length === 0) {
                        setAiMessages([{
                          role: 'assistant',
                          content: "Hi! I'm your AI assistant. I can help you create the perfect portal. What type of portal are you looking to build? For example, you could tell me:\n\n• \"Create a contractor portal\"\n• \"I need a portal for real estate agents\"\n• \"Build a tenant portal for apartment management\"\n\nJust describe what you need!"
                        }]);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                      showAIAssistant
                        ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/30'
                        : 'bg-[#1A1A1A] border border-[#2A2A2A] text-purple-400 hover:bg-purple-600/20 hover:border-purple-500/50'
                    }`}
                  >
                    <Brain className={`w-4 h-4 ${showAIAssistant ? 'animate-pulse' : ''}`} />
                    AI Assistant
                  </button>
                )}
                <button
                  onClick={handleSavePortal}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-all duration-200"
                >
                  <Save className="w-4 h-4" />
                  Save Portal
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-6">{/* Portal Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Portal Name
                </label>
                <input
                  type="text"
                  value={editingPortal.name}
                  onChange={(e) => setEditingPortal({ ...editingPortal, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 transition"
                  placeholder="Enter portal name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editingPortal.description}
                  onChange={(e) => setEditingPortal({ ...editingPortal, description: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 transition"
                  rows={3}
                  placeholder="Enter portal description"
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {ICON_OPTIONS.map((icon) => {
                    const IconComp = icon.component;
                    const isSelected = editingPortal.icon === icon.name;
                    return (
                      <button
                        key={icon.name}
                        onClick={() => setEditingPortal({ ...editingPortal, icon: icon.name })}
                        className={`p-4 rounded-lg border-2 transition ${
                          isSelected
                            ? 'bg-orange-600/20 border-orange-500'
                            : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-orange-500/50'
                        }`}
                      >
                        <IconComp className={`w-6 h-6 mx-auto ${isSelected ? 'text-orange-400' : 'text-gray-400'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Color Theme
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {COLOR_OPTIONS.map((color) => {
                    const isSelected = editingPortal.color === color.name;
                    return (
                      <button
                        key={color.name}
                        onClick={() => setEditingPortal({ ...editingPortal, color: color.name })}
                        className={`p-4 rounded-lg border-2 transition ${
                          isSelected
                            ? `bg-${color.name}-600/20 border-${color.name}-500`
                            : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-gray-500'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${color.class.replace('text-', 'bg-')} mx-auto`} />
                        <p className="text-xs text-gray-400 mt-2">{color.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Component Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Portal Component
                </label>
                <select
                  value={editingPortal.component}
                  onChange={(e) => setEditingPortal({ ...editingPortal, component: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 transition"
                >
                  {Object.keys(PORTAL_COMPONENTS).map((componentName) => (
                    <option key={componentName} value={componentName}>
                      {componentName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                <div>
                  <p className="text-white font-semibold">Enable Portal</p>
                  <p className="text-sm text-gray-400">Allow users to access this portal</p>
                </div>
                <button
                  onClick={() => setEditingPortal({ ...editingPortal, enabled: !editingPortal.enabled })}
                  className={`relative w-14 h-7 rounded-full transition ${
                    editingPortal.enabled ? 'bg-orange-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition transform ${
                      editingPortal.enabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Mobile Features Section */}
              <div className="p-6 bg-gradient-to-br from-blue-600/10 to-blue-700/5 rounded-lg border border-blue-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Mobile & Desktop Features</h3>
                    <p className="text-sm text-gray-400">Enable features for mobile and desktop access</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Push Notifications */}
                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-white">Push Notifications</span>
                    </div>
                    <button
                      onClick={() => setEditingPortal({
                        ...editingPortal,
                        mobileFeatures: {
                          ...editingPortal.mobileFeatures,
                          pushNotifications: !editingPortal.mobileFeatures?.pushNotifications
                        }
                      })}
                      className={`relative w-10 h-5 rounded-full transition ${
                        editingPortal.mobileFeatures?.pushNotifications ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition transform ${
                          editingPortal.mobileFeatures?.pushNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* GPS Tracking */}
                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-white">GPS Tracking</span>
                    </div>
                    <button
                      onClick={() => setEditingPortal({
                        ...editingPortal,
                        mobileFeatures: {
                          ...editingPortal.mobileFeatures,
                          gpsTracking: !editingPortal.mobileFeatures?.gpsTracking
                        }
                      })}
                      className={`relative w-10 h-5 rounded-full transition ${
                        editingPortal.mobileFeatures?.gpsTracking ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition transform ${
                          editingPortal.mobileFeatures?.gpsTracking ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Camera Access */}
                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-white">Camera Access</span>
                    </div>
                    <button
                      onClick={() => setEditingPortal({
                        ...editingPortal,
                        mobileFeatures: {
                          ...editingPortal.mobileFeatures,
                          cameraAccess: !editingPortal.mobileFeatures?.cameraAccess
                        }
                      })}
                      className={`relative w-10 h-5 rounded-full transition ${
                        editingPortal.mobileFeatures?.cameraAccess ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition transform ${
                          editingPortal.mobileFeatures?.cameraAccess ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Offline Mode */}
                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <WifiOff className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-white">Offline Mode</span>
                    </div>
                    <button
                      onClick={() => setEditingPortal({
                        ...editingPortal,
                        mobileFeatures: {
                          ...editingPortal.mobileFeatures,
                          offlineMode: !editingPortal.mobileFeatures?.offlineMode
                        }
                      })}
                      className={`relative w-10 h-5 rounded-full transition ${
                        editingPortal.mobileFeatures?.offlineMode ? 'bg-yellow-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition transform ${
                          editingPortal.mobileFeatures?.offlineMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Biometric Auth */}
                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-white">Biometric Auth</span>
                    </div>
                    <button
                      onClick={() => setEditingPortal({
                        ...editingPortal,
                        mobileFeatures: {
                          ...editingPortal.mobileFeatures,
                          biometricAuth: !editingPortal.mobileFeatures?.biometricAuth
                        }
                      })}
                      className={`relative w-10 h-5 rounded-full transition ${
                        editingPortal.mobileFeatures?.biometricAuth ? 'bg-red-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition transform ${
                          editingPortal.mobileFeatures?.biometricAuth ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* In-App Messaging */}
                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-white">In-App Messaging</span>
                    </div>
                    <button
                      onClick={() => setEditingPortal({
                        ...editingPortal,
                        mobileFeatures: {
                          ...editingPortal.mobileFeatures,
                          inAppMessaging: !editingPortal.mobileFeatures?.inAppMessaging
                        }
                      })}
                      className={`relative w-10 h-5 rounded-full transition ${
                        editingPortal.mobileFeatures?.inAppMessaging ? 'bg-cyan-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition transform ${
                          editingPortal.mobileFeatures?.inAppMessaging ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Document Scanning */}
                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-white">Document Scanning</span>
                    </div>
                    <button
                      onClick={() => setEditingPortal({
                        ...editingPortal,
                        mobileFeatures: {
                          ...editingPortal.mobileFeatures,
                          documentScanning: !editingPortal.mobileFeatures?.documentScanning
                        }
                      })}
                      className={`relative w-10 h-5 rounded-full transition ${
                        editingPortal.mobileFeatures?.documentScanning ? 'bg-orange-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition transform ${
                          editingPortal.mobileFeatures?.documentScanning ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Video Call */}
                  <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-pink-400" />
                      <span className="text-sm text-white">Video Call</span>
                    </div>
                    <button
                      onClick={() => setEditingPortal({
                        ...editingPortal,
                        mobileFeatures: {
                          ...editingPortal.mobileFeatures,
                          videoCall: !editingPortal.mobileFeatures?.videoCall
                        }
                      })}
                      className={`relative w-10 h-5 rounded-full transition ${
                        editingPortal.mobileFeatures?.videoCall ? 'bg-pink-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition transform ${
                          editingPortal.mobileFeatures?.videoCall ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* AI Assistant Panel - Slides in from right */}
        {showAIAssistant && (
          <div className="w-96 bg-[#0F0F0F] border-l border-[#2A2A2A] flex flex-col">
            {/* AI Assistant Header */}
            <div className="p-4 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-white">AI Assistant</h3>
                </div>
                <button
                  onClick={() => setShowAIAssistant(false)}
                  className="p-1 hover:bg-[#1A1A1A] rounded transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400">Powered by AI to help you create the perfect portal</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-purple-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-orange-600/20 border border-orange-500/30 text-white'
                        : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-orange-600/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-orange-400" />
                    </div>
                  )}
                </div>
              ))}
              {aiLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      <span className="text-sm text-gray-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#2A2A2A]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && aiInput.trim() && !aiLoading) {
                      const userMessage = aiInput.trim();
                      setAiMessages([...aiMessages, { role: 'user', content: userMessage }]);
                      setAiInput('');
                      setAiLoading(true);

                      // Simulate AI response
                      setTimeout(() => {
                        let response = '';
                        const lowerInput = userMessage.toLowerCase();

                        if (lowerInput.includes('contractor') || lowerInput.includes('builder')) {
                          response = "Great! I'll help you create a Contractor Portal. Here's what I recommend:\n\n• Name: Contractor Portal\n• Description: For contractors and builders to manage projects\n• Icon: Wrench\n• Color: Yellow\n• Component: OnCallEmergencyPortal\n\nClick 'Apply Suggestion' or let me know if you'd like to adjust anything!";
                          setEditingPortal({
                            ...editingPortal,
                            name: 'Contractor Portal',
                            description: 'For contractors and builders to manage projects',
                            icon: 'Wrench',
                            color: 'yellow',
                            component: 'OnCallEmergencyPortal'
                          });
                        } else if (lowerInput.includes('tenant') || lowerInput.includes('renter')) {
                          response = "Perfect! A Tenant Portal is a great idea. Here's my suggestion:\n\n• Name: Tenant Portal\n• Description: For tenants to manage rentals and maintenance\n• Icon: Home\n• Color: Blue\n• Component: MobileOwnerPortalView\n\nI've applied these settings. Feel free to customize further!";
                          setEditingPortal({
                            ...editingPortal,
                            name: 'Tenant Portal',
                            description: 'For tenants to manage rentals and maintenance',
                            icon: 'Home',
                            color: 'blue',
                            component: 'MobileOwnerPortalView'
                          });
                        } else if (lowerInput.includes('agent') || lowerInput.includes('real estate')) {
                          response = "Excellent choice! Here's a Real Estate Agent Portal setup:\n\n• Name: Agent Portal\n• Description: For real estate agents and brokers\n• Icon: Key\n• Color: Indigo\n• Component: InvestorPortalView\n\nSettings applied! Let me know if you need any changes.";
                          setEditingPortal({
                            ...editingPortal,
                            name: 'Agent Portal',
                            description: 'For real estate agents and brokers',
                            icon: 'Key',
                            color: 'indigo',
                            component: 'InvestorPortalView'
                          });
                        } else {
                          response = "I can help you create that portal! Could you tell me more about:\n\n1. What is the main purpose of this portal?\n2. Who will be using it?\n3. What features do they need?\n\nOr try describing it like: 'Create a portal for [user type] to [main purpose]'";
                        }

                        setAiMessages(prev => [...prev, { role: 'assistant', content: response }]);
                        setAiLoading(false);
                      }, 1500);
                    }
                  }}
                  placeholder="Ask AI for help..."
                  className="flex-1 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                />
                <button
                  onClick={() => {
                    if (aiInput.trim() && !aiLoading) {
                      const event = { key: 'Enter' } as React.KeyboardEvent;
                      const input = document.querySelector('input[placeholder="Ask AI for help..."]') as HTMLInputElement;
                      if (input) {
                        input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
                      }
                    }
                  }}
                  disabled={!aiInput.trim() || aiLoading}
                  className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Try: "Create a contractor portal" or "I need a tenant portal"</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Global Settings view
  if (view === 'global-settings') {
    return <PortalGlobalSettings onBack={() => setView('grid')} />;
  }

  // Render grid view
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/unified-dashboard'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:border-orange-500/50 hover:bg-[#1A1A1A]/80 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              Portals Hub
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('global-settings')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:border-blue-500/50 hover:bg-blue-600/10 transition-all duration-200 rounded-lg"
            >
              <Sliders className="w-4 h-4 text-blue-400" />
              <span className="font-semibold">Global Settings</span>
            </button>
            <button
              onClick={handleCreatePortal}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Create Portal
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-xs text-gray-400">Total Portals</span>
              </div>
              <div className="text-3xl font-bold text-white">{portals.length}</div>
              <div className="text-xs text-gray-500 mt-2">Active configurations</div>
            </div>
            
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs text-gray-400">Enabled</span>
              </div>
              <div className="text-3xl font-bold text-white">{portals.filter(p => p.enabled).length}</div>
              <div className="text-xs text-gray-500 mt-2">Available to users</div>
            </div>
            
            <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400">Components</span>
              </div>
              <div className="text-3xl font-bold text-white">{Object.keys(PORTAL_COMPONENTS).length}</div>
              <div className="text-xs text-gray-500 mt-2">Available templates</div>
            </div>
          </div>

          {/* Portal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {portals.map((portal) => {
              const IconComponent = getIconComponent(portal.icon);
              return (
                <div
                  key={portal.id}
                  className="group relative p-5 rounded-xl border border-[#2A2A2A] bg-gradient-to-br from-[#1A1A1A]/40 to-[#0F0F0F]/40 backdrop-blur-sm hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300"
                >
                  {/* Enabled Badge */}
                  {!portal.enabled && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-gray-600/20 border border-gray-500/30 rounded text-xs text-gray-400">
                      Disabled
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${portal.color}-500/10 to-${portal.color}-600/5 flex items-center justify-center mb-3`}>
                    <IconComponent className={`w-6 h-6 ${getColorClass(portal.color)}`} />
                  </div>

                  {/* Portal Name */}
                  <h3 className="text-base font-bold text-white mb-1">
                    {portal.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                    {portal.description}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewPortal(portal)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg transition text-sm font-semibold"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleEditPortal(portal)}
                      className="flex items-center justify-center p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePortal(portal.id)}
                      className="flex items-center justify-center p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info Card */}
          <div className="mt-6 p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Portals Hub Features</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Create:</strong> Build new portals with custom names, icons, colors, and components</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Edit:</strong> Modify existing portal configurations at any time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Delete:</strong> Remove portals you no longer need</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span><strong>Preview:</strong> View portals exactly as customers will see them</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}