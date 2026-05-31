import { TextArea } from '../ui/input/TextArea';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface PortalBuilderProps {
  portalId?: string; // If provided, we're editing an existing portal
  onClose: () => void;
  onSave: () => void;
}

const API_BASE = `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/server`;

interface PortalFunction {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  component: string;
  color: string;
}

interface PortalSection {
  id: string;
  title: string;
  layout: 'grid' | 'list' | 'carousel' | 'tabs';
  columns: number;
  functions: PortalFunction[];
  expanded: boolean;
}

interface PortalConfig {
  id?: string;
  name: string;
  description: string;
  icon: string;
  targetRole: string;
  backgroundColor: string;
  primaryColor: string;
  sections: PortalSection[];
  isPublished: boolean;
}

const AVAILABLE_FUNCTIONS: PortalFunction[] = [
  // Core Functions
  { id: 'dashboard', name: 'Dashboard', icon: 'Home', description: 'Main overview', category: 'Core', component: 'DashboardWidget', color: '#ea580c' },
  { id: 'profile', name: 'Profile', icon: 'Users', description: 'User profile', category: 'Core', component: 'ProfileWidget', color: '#3b82f6' },
  { id: 'settings', name: 'Settings', icon: 'Settings', description: 'App settings', category: 'Core', component: 'SettingsWidget', color: '#6b7280' },
  { id: 'notifications', name: 'Notifications', icon: 'Bell', description: 'Alerts & updates', category: 'Core', component: 'NotificationsWidget', color: '#f59e0b' },
  
  // Communication
  { id: 'messages', name: 'Messages', icon: 'MessageSquare', description: 'Chat & messaging', category: 'Communication', component: 'MessagesWidget', color: '#10b981' },
  { id: 'calendar', name: 'Calendar', icon: 'Calendar', description: 'Schedule & events', category: 'Communication', component: 'CalendarWidget', color: '#8b5cf6' },
  { id: 'video-call', name: 'Video Call', icon: 'Video', description: 'Video conferencing', category: 'Communication', component: 'VideoCallWidget', color: '#ec4899' },
  { id: 'voice-notes', name: 'Voice Notes', icon: 'Mic', description: 'Audio messages', category: 'Communication', component: 'VoiceNotesWidget', color: '#14b8a6' },
  
  // Work Management
  { id: 'tasks', name: 'Tasks', icon: 'CheckCircle', description: 'Task management', category: 'Work', component: 'TasksWidget', color: '#22c55e' },
  { id: 'projects', name: 'Projects', icon: 'Briefcase', description: 'Project tracking', category: 'Work', component: 'ProjectsWidget', color: '#06b6d4' },
  { id: 'work-orders', name: 'Work Orders', icon: 'FileText', description: 'Service orders', category: 'Work', component: 'WorkOrdersWidget', color: '#f97316' },
  { id: 'time-tracking', name: 'Time Tracking', icon: 'Clock', description: 'Track work hours', category: 'Work', component: 'TimeTrackingWidget', color: '#84cc16' },
  { id: 'schedules', name: 'Schedules', icon: 'Calendar', description: 'Work schedules', category: 'Work', component: 'SchedulesWidget', color: '#a855f7' },
  
  // Field Operations
  { id: 'location', name: 'Location', icon: 'MapPin', description: 'GPS tracking', category: 'Field', component: 'LocationWidget', color: '#ef4444' },
  { id: 'camera', name: 'Camera', icon: 'Camera', description: 'Photo capture', category: 'Field', component: 'CameraWidget', color: '#3b82f6' },
  { id: 'video-capture', name: 'Video Capture', icon: 'Video', description: 'Record videos', category: 'Field', component: 'VideoWidget', color: '#ec4899' },
  { id: 'site-checklist', name: 'Site Checklist', icon: 'CheckCircle', description: 'Field checklists', category: 'Field', component: 'ChecklistWidget', color: '#10b981' },
  { id: 'measurements', name: 'Measurements', icon: 'Wrench', description: 'Take measurements', category: 'Field', component: 'MeasurementsWidget', color: '#f59e0b' },
  
  // Financial
  { id: 'invoices', name: 'Invoices', icon: 'FileText', description: 'Invoice management', category: 'Financial', component: 'InvoicesWidget', color: '#10b981' },
  { id: 'payments', name: 'Payments', icon: 'DollarSign', description: 'Payment processing', category: 'Financial', component: 'PaymentsWidget', color: '#22c55e' },
  { id: 'expenses', name: 'Expenses', icon: 'TrendingUp', description: 'Expense tracking', category: 'Financial', component: 'ExpensesWidget', color: '#f59e0b' },
  { id: 'estimates', name: 'Estimates', icon: 'FileText', description: 'Create estimates', category: 'Financial', component: 'EstimatesWidget', color: '#06b6d4' },
  
  // Analytics
  { id: 'analytics', name: 'Analytics', icon: 'BarChart3', description: 'Data insights', category: 'Analytics', component: 'AnalyticsWidget', color: '#8b5cf6' },
  { id: 'reports', name: 'Reports', icon: 'PieChart', description: 'Generate reports', category: 'Analytics', component: 'ReportsWidget', color: '#3b82f6' },
  { id: 'metrics', name: 'Metrics', icon: 'LineChart', description: 'Performance metrics', category: 'Analytics', component: 'MetricsWidget', color: '#06b6d4' },
  { id: 'activity', name: 'Activity Log', icon: 'Activity', description: 'Activity history', category: 'Analytics', component: 'ActivityWidget', color: '#6b7280' },
  
  // Inventory
  { id: 'inventory', name: 'Inventory', icon: 'Package', description: 'Stock management', category: 'Inventory', component: 'InventoryWidget', color: '#14b8a6' },
  { id: 'equipment', name: 'Equipment', icon: 'HardHat', description: 'Equipment tracking', category: 'Inventory', component: 'EquipmentWidget', color: '#f97316' },
  { id: 'materials', name: 'Materials', icon: 'Box', description: 'Material orders', category: 'Inventory', component: 'MaterialsWidget', color: '#84cc16' },
  { id: 'vehicles', name: 'Vehicles', icon: 'Truck', description: 'Fleet management', category: 'Inventory', component: 'VehiclesWidget', color: '#ef4444' },
  
  // Safety & Compliance
  { id: 'safety', name: 'Safety', icon: 'Shield', description: 'Safety protocols', category: 'Safety', component: 'SafetyWidget', color: '#dc2626' },
  { id: 'incidents', name: 'Incidents', icon: 'AlertCircle', description: 'Report incidents', category: 'Safety', component: 'IncidentsWidget', color: '#f97316' },
  { id: 'certifications', name: 'Certifications', icon: 'Award', description: 'Track certifications', category: 'Safety', component: 'CertificationsWidget', color: '#10b981' },
  { id: 'training', name: 'Training', icon: 'Target', description: 'Training modules', category: 'Safety', component: 'TrainingWidget', color: '#8b5cf6' },
];

const ICON_MAP: Record<string, any> = {
  Home, Users, Settings, Bell, MessageSquare, Calendar, Video, Mic,
  CheckCircle, Briefcase, FileText, Clock, MapPin, Camera, Wrench,
  DollarSign, TrendingUp, BarChart3, PieChart, LineChart, Activity,
  Package, HardHat, Box, Truck, Shield, AlertCircle, Award, Target,
  Layout, Grid3X3, Smartphone, Palette, Type, ImageIcon, Layers,
  LayoutGrid, LayoutList, Columns, Square, Circle, Star, Search,
  Zap, Info
};

function SortableFunction({ functionItem, onRemove }: { functionItem: PortalFunction; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: functionItem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = ICON_MAP[functionItem.icon] || Box;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[#1A1A1A] border-2 ${isDragging ? 'border-orange-500' : 'border-[#2A2A2A]'} rounded-xl p-4 group`}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-500 hover:text-orange-400 transition-colors mt-1"
        >
          <GripVertical className="w-5 h-5" />
        </div>
        
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: functionItem.color + '20' }}
        >
          <Icon className="w-5 h-5" style={{ color: functionItem.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm">{functionItem.name}</h4>
          <p className="text-xs text-gray-400 mt-0.5">{functionItem.description}</p>
          <span className="inline-block px-2 py-0.5 bg-[#2A2A2A] text-gray-400 text-xs rounded mt-2">
            {functionItem.category}
          </span>
        </div>

        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function PortalBuilder({ portalId, onClose, onSave }: PortalBuilderProps) {
  const [config, setConfig] = useState<PortalConfig>({
    name: '',
    description: '',
    icon: 'Smartphone',
    targetRole: 'employee',
    backgroundColor: '#0A0A0A',
    primaryColor: '#ea580c',
    sections: [
      {
        id: 'section-1',
        title: 'Quick Access',
        layout: 'grid',
        columns: 2,
        functions: [],
        expanded: true,
      }
    ],
    isPublished: false,
  });

  const [activeTab, setActiveTab] = useState<'design' | 'functions' | 'preview'>('design');
  const [selectedSection, setSelectedSection] = useState<string>('section-1');
  const [showFunctionLibrary, setShowFunctionLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (portalId) {
      loadPortal();
    }
  }, [portalId]);

  const loadPortal = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/make-server-57095a78/mobile-portals/${portalId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load portal: ${response.statusText}`);
      }

      const data = await response.json();

      if (data) {
        setConfig({
          id: data.id,
          name: data.name,
          description: data.description,
          icon: data.icon,
          targetRole: data.target_role,
          backgroundColor: data.background_color || '#0A0A0A',
          primaryColor: data.primary_color || '#ea580c',
          sections: data.sections || [],
          isPublished: data.is_published,
        });
      }
    } catch (err: any) {
      console.error('Error loading portal:', err);
      toast.error('Failed to load portal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    if (!config.name.trim()) {
      toast.error('Please enter a portal name');
      return;
    }

    setIsSaving(true);
    try {
      const portalData = {
        name: config.name,
        description: config.description,
        icon: config.icon,
        target_role: config.targetRole,
        background_color: config.backgroundColor,
        primary_color: config.primaryColor,
        sections: config.sections,
        is_published: publish,
      };

      if (config.id) {
        // Update existing
        const response = await fetch(`${API_BASE}/make-server-57095a78/mobile-portals/${config.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(portalData),
        });

        if (!response.ok) {
          throw new Error(`Failed to update portal: ${response.statusText}`);
        }

        toast.success(`Portal ${publish ? 'published' : 'saved'} successfully!`);
      } else {
        // Create new
        const response = await fetch(`${API_BASE}/make-server-57095a78/mobile-portals`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(portalData),
        });

        if (!response.ok) {
          throw new Error(`Failed to create portal: ${response.statusText}`);
        }

        toast.success('Portal created successfully!');
      }

      onSave();
    } catch (err: any) {
      console.error('Error saving portal:', err);
      toast.error(err.message || 'Failed to save portal');
    } finally {
      setIsSaving(false);
    }
  };

  const addSection = () => {
    const newSection: PortalSection = {
      id: `section-${Date.now()}`,
      title: `Section ${config.sections.length + 1}`,
      layout: 'grid',
      columns: 2,
      functions: [],
      expanded: true,
    };
    setConfig({ ...config, sections: [...config.sections, newSection] });
    setSelectedSection(newSection.id);
  };

  const removeSection = (sectionId: string) => {
    if (config.sections.length === 1) {
      toast.error('Portal must have at least one section');
      return;
    }
    setConfig({
      ...config,
      sections: config.sections.filter(s => s.id !== sectionId)
    });
    if (selectedSection === sectionId) {
      setSelectedSection(config.sections[0].id);
    }
  };

  const updateSection = (sectionId: string, updates: Partial<PortalSection>) => {
    setConfig({
      ...config,
      sections: config.sections.map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      )
    });
  };

  const addFunctionToSection = (sectionId: string, func: PortalFunction) => {
    const section = config.sections.find(s => s.id === sectionId);
    if (section && section.functions.some(f => f.id === func.id)) {
      toast.error('Function already added to this section');
      return;
    }

    updateSection(sectionId, {
      functions: [...(section?.functions || []), func]
    });
    toast.success(`Added ${func.name} to section`);
  };

  const removeFunctionFromSection = (sectionId: string, functionId: string) => {
    const section = config.sections.find(s => s.id === sectionId);
    updateSection(sectionId, {
      functions: section?.functions.filter(f => f.id !== functionId) || []
    });
  };

  const handleDragEnd = (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const section = config.sections.find(s => s.id === sectionId);
      if (section) {
        const oldIndex = section.functions.findIndex(f => f.id === active.id);
        const newIndex = section.functions.findIndex(f => f.id === over.id);
        const newFunctions = arrayMove(section.functions, oldIndex, newIndex);
        updateSection(sectionId, { functions: newFunctions });
      }
    }
  };

  const categories = ['All', ...Array.from(new Set(AVAILABLE_FUNCTIONS.map(f => f.category)))];
  const filteredFunctions = selectedCategory === 'All'
    ? AVAILABLE_FUNCTIONS
    : AVAILABLE_FUNCTIONS.filter(f => f.category === selectedCategory);

  const currentSection = config.sections.find(s => s.id === selectedSection);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#2A2A2A] rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {config.id ? 'Edit Portal' : 'Create New Portal'}
                </h1>
                <p className="text-sm text-gray-400">
                  {config.id ? 'Customize existing portal' : 'Design a custom mobile experience'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl font-semibold transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Publish Portal
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'design', label: 'Design', icon: Layout },
              { id: 'functions', label: 'Functions', icon: Grid3X3 },
              { id: 'preview', label: 'Preview', icon: Eye }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500'
                      : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'design' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Portal Settings */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Portal Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Portal Name *
                      </label>
                      <input
                        type="text"
                        value={config.name}
                        onChange={(e) => setConfig({ ...config, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Employee Portal"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <TextArea
                        value={config.description}
                        onChange={(value) => setConfig({ ...config, description: value })}
                        rows={3}
                        placeholder="Portal description..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Target Role
                      </label>
                      <select
                        value={config.targetRole}
                        onChange={(e) => setConfig({ ...config, targetRole: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="employee">Employee</option>
                        <option value="technician">Technician</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="subcontractor">Subcontractor</option>
                        <option value="client">Client</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Icon
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {['Smartphone', 'Briefcase', 'Users', 'Settings', 'Star', 'Home'].map(iconName => {
                          const Icon = ICON_MAP[iconName];
                          return (
                            <button
                              key={iconName}
                              onClick={() => setConfig({ ...config, icon: iconName })}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                config.icon === iconName
                                  ? 'border-orange-500 bg-orange-500/20'
                                  : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                              }`}
                            >
                              <Icon className="w-5 h-5 text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Primary Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="h-10 w-20 rounded-lg border border-[#2A2A2A] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="flex-1 px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sections List */}
              <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Sections</h3>
                  <button
                    onClick={addSection}
                    className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {config.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        selectedSection === section.id
                          ? 'bg-orange-500/20 border-2 border-orange-500'
                          : 'border border-[#2A2A2A] hover:border-[#3A3A3A]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Layers className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-white text-sm">{section.title}</span>
                        <span className="text-xs text-gray-500">({section.functions.length})</span>
                      </div>
                      {config.sections.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(section.id);
                          }}
                          className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Section Editor */}
            <div className="lg:col-span-2">
              {currentSection && (
                <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
                  {/* Section Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={currentSection.title}
                        onChange={(e) => updateSection(currentSection.id, { title: e.target.value })}
                        className="text-xl font-bold text-white bg-transparent border-b-2 border-transparent hover:border-[#2A2A2A] focus:border-orange-500 outline-none px-2 -ml-2 w-full"
                      />
                      <p className="text-sm text-gray-400 mt-1 px-2">
                        {currentSection.functions.length} function{currentSection.functions.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <button
                      onClick={() => setShowFunctionLibrary(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Function
                    </button>
                  </div>

                  {/* Layout Options */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300">
                      Layout Style
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'grid', label: 'Grid', icon: Grid3X3 },
                        { value: 'list', label: 'List', icon: LayoutList },
                        { value: 'carousel', label: 'Carousel', icon: Columns },
                        { value: 'tabs', label: 'Tabs', icon: LayoutGrid }
                      ].map(layout => {
                        const Icon = layout.icon;
                        return (
                          <button
                            key={layout.value}
                            onClick={() => updateSection(currentSection.id, { layout: layout.value as any })}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                              currentSection.layout === layout.value
                                ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                                : 'border-[#2A2A2A] hover:border-[#3A3A3A] text-gray-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{layout.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {currentSection.layout === 'grid' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Grid Columns
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map(cols => (
                          <button
                            key={cols}
                            onClick={() => updateSection(currentSection.id, { columns: cols })}
                            className={`flex-1 py-2 rounded-lg border-2 font-medium transition-all ${
                              currentSection.columns === cols
                                ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                                : 'border-[#2A2A2A] hover:border-[#3A3A3A] text-gray-400'
                            }`}
                          >
                            {cols}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Functions List */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Functions in this section</h4>
                    
                    {currentSection.functions.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-[#2A2A2A] rounded-xl">
                        <Box className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">No functions added yet</p>
                        <button
                          onClick={() => setShowFunctionLibrary(true)}
                          className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors"
                        >
                          Add Your First Function
                        </button>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(event, currentSection.id)}
                      >
                        <SortableContext
                          items={currentSection.functions.map(f => f.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {currentSection.functions.map((func) => (
                              <SortableFunction
                                key={func.id}
                                functionItem={func}
                                onRemove={() => removeFunctionFromSection(currentSection.id, func.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'functions' && (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h3 className="text-xl font-bold text-white mb-6">Available Functions</h3>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500'
                      : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Functions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFunctions.map(func => {
                const Icon = ICON_MAP[func.icon] || Box;
                const isAdded = config.sections.some(s => 
                  s.functions.some(f => f.id === func.id)
                );

                return (
                  <div
                    key={func.id}
                    className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: func.color + '20' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: func.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm">{func.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{func.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 bg-[#2A2A2A] px-2 py-1 rounded">
                        {func.category}
                      </span>
                      
                      {isAdded ? (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => currentSection && addFunctionToSection(currentSection.id, func)}
                          className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <div className="bg-[#1A1A1A] rounded-3xl border-4 border-[#2A2A2A] p-4 shadow-2xl">
                {/* Mobile Device Frame */}
                <div className="bg-[#0A0A0A] rounded-2xl overflow-hidden" style={{ aspectRatio: '9/19.5' }}>
                  {/* Status Bar */}
                  <div className="h-10 bg-[#0F0F0F] flex items-center justify-between px-6 text-xs text-gray-400">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-3 border border-gray-600 rounded-sm" />
                      <div className="w-1 h-3 bg-gray-600 rounded-sm" />
                    </div>
                  </div>

                  {/* Portal Content */}
                  <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 2.5rem)' }}>
                    <div className="flex items-center gap-3 mb-6">
                      {(() => {
                        const Icon = ICON_MAP[config.icon] || Smartphone;
                        return <Icon className="w-8 h-8 text-orange-400" />;
                      })()}
                      <div>
                        <h2 className="font-bold text-white">{config.name || 'Portal Preview'}</h2>
                        <p className="text-xs text-gray-400">{config.description || 'Your portal description'}</p>
                      </div>
                    </div>

                    {config.sections.map((section) => (
                      <div key={section.id} className="mb-6">
                        <h3 className="text-sm font-semibold text-white mb-3">{section.title}</h3>
                        
                        {section.layout === 'grid' && (
                          <div
                            className="grid gap-3"
                            style={{ gridTemplateColumns: `repeat(${section.columns}, 1fr)` }}
                          >
                            {section.functions.map(func => {
                              const Icon = ICON_MAP[func.icon] || Box;
                              return (
                                <div
                                  key={func.id}
                                  className="bg-[#1A1A1A] rounded-xl p-3 flex flex-col items-center gap-2 text-center"
                                >
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: func.color + '20' }}
                                  >
                                    <Icon className="w-5 h-5" style={{ color: func.color }} />
                                  </div>
                                  <span className="text-xs font-medium text-white">{func.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {section.layout === 'list' && (
                          <div className="space-y-2">
                            {section.functions.map(func => {
                              const Icon = ICON_MAP[func.icon] || Box;
                              return (
                                <div
                                  key={func.id}
                                  className="bg-[#1A1A1A] rounded-xl p-3 flex items-center gap-3"
                                >
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: func.color + '20' }}
                                  >
                                    <Icon className="w-5 h-5" style={{ color: func.color }} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-white">{func.name}</div>
                                    <div className="text-xs text-gray-400">{func.description}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Function Library Modal */}
      {showFunctionLibrary && currentSection && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Function Library</h3>
                <button
                  onClick={() => setShowFunctionLibrary(false)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === category
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredFunctions.map(func => {
                  const Icon = ICON_MAP[func.icon] || Box;
                  const isAdded = currentSection.functions.some(f => f.id === func.id);

                  return (
                    <button
                      key={func.id}
                      onClick={() => {
                        if (!isAdded) {
                          addFunctionToSection(currentSection.id, func);
                          setShowFunctionLibrary(false);
                        }
                      }}
                      disabled={isAdded}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        isAdded
                          ? 'border-emerald-500/30 bg-emerald-500/10 cursor-not-allowed'
                          : 'border-[#2A2A2A] hover:border-orange-500 hover:bg-orange-500/5'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: func.color + '20' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: func.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white text-sm">{func.name}</h4>
                          {isAdded && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400">{func.description}</p>
                        <span className="inline-block mt-2 text-xs text-gray-500 bg-[#2A2A2A] px-2 py-0.5 rounded">
                          {func.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}