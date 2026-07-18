/**
 * Quote Context Panel
 * 
 * Displays active quote information alongside the design
 * Shows materials, costs, timeline, and allows sync back to quote
 */

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Package, 
  Calendar, 
  User, 
  ArrowLeft, 
  Save, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Edit3,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface QuoteData {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  projectTitle: string;
  status: 'draft' | 'pending' | 'approved' | 'in-progress';
  createdDate: string;
  total: number;
  materials: QuoteMaterial[];
  labor: QuoteLabor[];
  timeline: {
    estimatedDays: number;
    startDate?: string;
    endDate?: string;
  };
  floorPlanData?: any;
  designNotes?: string;
}

interface QuoteMaterial {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  supplier?: string;
  inDesign?: boolean; // Linked to design element
}

interface QuoteLabor {
  id: string;
  task: string;
  hours: number;
  rate: number;
  totalPrice: number;
}

interface QuoteContextPanelProps {
  quoteData: QuoteData;
  onSaveToQuote: (updatedData: any) => void;
  onReturnToQuote: () => void;
  designElements: any[];
  onUpdateDesign?: (elements: any[]) => void;
}

export default function QuoteContextPanel({
  quoteData,
  onSaveToQuote,
  onReturnToQuote,
  designElements,
  onUpdateDesign
}: QuoteContextPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'labor' | 'timeline'>('overview');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'modified' | 'saving'>('synced');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Track when design changes
  useEffect(() => {
    if (designElements.length > 0) {
      setHasUnsavedChanges(true);
      setSyncStatus('modified');
    }
  }, [designElements]);

  const handleSaveToQuote = async () => {
    setSyncStatus('saving');
    toast.info('Saving design to quote...', {
      description: 'Updating materials and costs'
    });

    try {
      // Extract materials from design
      const designMaterials = extractMaterialsFromDesign(designElements);
      
      // Calculate updated costs
      const updatedQuote = {
        ...quoteData,
        floorPlanData: {
          elements: designElements,
          timestamp: new Date().toISOString()
        },
        materials: [...quoteData.materials, ...designMaterials],
        lastModified: new Date().toISOString()
      };

      // Save to quote
      await onSaveToQuote(updatedQuote);
      
      setHasUnsavedChanges(false);
      setSyncStatus('synced');
      
      toast.success('Design saved to quote!', {
        description: 'Quote updated with latest design and materials'
      });
    } catch (error) {
      setSyncStatus('modified');
      toast.error('Failed to save design', {
        description: 'Please try again'
      });
    }
  };

  const extractMaterialsFromDesign = (elements: any[]): QuoteMaterial[] => {
    const materials: QuoteMaterial[] = [];
    
    // Count walls
    const walls = elements.filter(el => el.type === 'wall');
    if (walls.length > 0) {
      const totalWallLength = walls.reduce((sum, wall) => sum + (wall.width / 12), 0); // Convert to feet
      materials.push({
        id: `material-walls-${Date.now()}`,
        name: '2x4 Framing Lumber',
        category: 'Framing',
        quantity: Math.ceil(totalWallLength / 8) * 3, // 3 studs per 8' section
        unit: 'ea',
        unitPrice: 4.50,
        totalPrice: Math.ceil(totalWallLength / 8) * 3 * 4.50,
        inDesign: true
      });
    }

    // Count doors
    const doors = elements.filter(el => el.type === 'door');
    if (doors.length > 0) {
      materials.push({
        id: `material-doors-${Date.now()}`,
        name: 'Interior Door (Pre-hung)',
        category: 'Doors',
        quantity: doors.length,
        unit: 'ea',
        unitPrice: 175.00,
        totalPrice: doors.length * 175.00,
        inDesign: true
      });
    }

    // Count windows
    const windows = elements.filter(el => el.type === 'window');
    if (windows.length > 0) {
      materials.push({
        id: `material-windows-${Date.now()}`,
        name: 'Double-Hung Window',
        category: 'Windows',
        quantity: windows.length,
        unit: 'ea',
        unitPrice: 350.00,
        totalPrice: windows.length * 350.00,
        inDesign: true
      });
    }

    // Count electrical outlets
    const outlets = elements.filter(el => el.type === 'electrical' && el.subtype === 'outlet');
    if (outlets.length > 0) {
      materials.push({
        id: `material-outlets-${Date.now()}`,
        name: 'Electrical Outlets (Duplex)',
        category: 'Electrical',
        quantity: outlets.length,
        unit: 'ea',
        unitPrice: 12.00,
        totalPrice: outlets.length * 12.00,
        inDesign: true
      });
    }

    // Count switches
    const switches = elements.filter(el => el.type === 'electrical' && el.subtype === 'switch');
    if (switches.length > 0) {
      materials.push({
        id: `material-switches-${Date.now()}`,
        name: 'Light Switches',
        category: 'Electrical',
        quantity: switches.length,
        unit: 'ea',
        unitPrice: 8.00,
        totalPrice: switches.length * 8.00,
        inDesign: true
      });
    }

    // Count plumbing fixtures
    const plumbing = elements.filter(el => el.type === 'plumbing');
    plumbing.forEach(fixture => {
      let name = 'Plumbing Fixture';
      let price = 150.00;
      
      if (fixture.subtype === 'sink') {
        name = 'Sink with Faucet';
        price = 250.00;
      } else if (fixture.subtype === 'toilet') {
        name = 'Toilet (Complete)';
        price = 300.00;
      } else if (fixture.subtype === 'shower') {
        name = 'Shower Assembly';
        price = 450.00;
      }
      
      materials.push({
        id: `material-plumbing-${fixture.id}`,
        name,
        category: 'Plumbing',
        quantity: 1,
        unit: 'ea',
        unitPrice: price,
        totalPrice: price,
        inDesign: true
      });
    });

    return materials;
  };

  const calculateDesignTotal = () => {
    const designMaterials = extractMaterialsFromDesign(designElements);
    return designMaterials.reduce((sum, mat) => sum + mat.totalPrice, 0);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-600',
      pending: 'bg-yellow-600',
      approved: 'bg-green-600',
      'in-progress': 'bg-blue-600'
    };
    return colors[status] || 'bg-gray-600';
  };

  const getSyncStatusInfo = () => {
    if (syncStatus === 'synced') {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-400" />,
        text: 'Synced with quote',
        color: 'text-green-400'
      };
    } else if (syncStatus === 'modified') {
      return {
        icon: <AlertCircle className="w-4 h-4 text-yellow-400" />,
        text: 'Unsaved changes',
        color: 'text-yellow-400'
      };
    } else {
      return {
        icon: <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />,
        text: 'Saving...',
        color: 'text-blue-400'
      };
    }
  };

  return (
    <>
      <div className={`fixed right-0 top-16 h-[calc(100vh-64px)] bg-[#0A0A0A] border-l border-[#2A2A2A] transition-all duration-300 z-40 ${
        expanded ? 'w-96' : 'w-12'
      }`}>
        
        {/* Toggle Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="absolute -left-10 top-4 p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-l-lg hover:bg-[#2A2A2A] transition text-white"
          title={expanded ? 'Collapse Quote Panel' : 'Expand Quote Panel'}
        >
          {expanded ? <ChevronDown className="w-5 h-5 rotate-90" /> : <ChevronUp className="w-5 h-5 rotate-90" />}
        </button>

        {expanded && (
          <div className="h-full flex flex-col">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[#ea580c] to-orange-600 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold text-lg">Active Quote</h3>
                <div className="flex items-center gap-2">
                  {getSyncStatusInfo().icon}
                  <span className={`text-xs ${getSyncStatusInfo().color}`}>
                    {getSyncStatusInfo().text}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-white/90 font-semibold">{quoteData.quoteNumber}</p>
                <p className="text-white/80 text-sm">{quoteData.projectTitle}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getStatusColor(quoteData.status)}`}>
                    {quoteData.status.toUpperCase()}
                  </span>
                  <span className="text-white/90 font-bold text-lg">
                    ${quoteData.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#2A2A2A] bg-[#1A1A1A]">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeTab === 'overview'
                    ? 'bg-[#0A0A0A] text-white border-b-2 border-[#ea580c]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeTab === 'materials'
                    ? 'bg-[#0A0A0A] text-white border-b-2 border-[#ea580c]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Materials
              </button>
              <button
                onClick={() => setActiveTab('labor')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeTab === 'labor'
                    ? 'bg-[#0A0A0A] text-white border-b-2 border-[#ea580c]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Labor
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Customer Info */}
                  <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-[#ea580c]" />
                      <h4 className="text-white font-semibold">Customer</h4>
                    </div>
                    <p className="text-gray-300">{quoteData.customerName}</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Created: {new Date(quoteData.createdDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Design Stats */}
                  <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-[#ea580c]" />
                      <h4 className="text-white font-semibold">Design Elements</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">Walls</p>
                        <p className="text-white font-semibold">
                          {designElements.filter(el => el.type === 'wall').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Doors</p>
                        <p className="text-white font-semibold">
                          {designElements.filter(el => el.type === 'door').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Windows</p>
                        <p className="text-white font-semibold">
                          {designElements.filter(el => el.type === 'window').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Rooms</p>
                        <p className="text-white font-semibold">
                          {designElements.filter(el => el.type === 'room').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Electrical</p>
                        <p className="text-white font-semibold">
                          {designElements.filter(el => el.type === 'electrical').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Plumbing</p>
                        <p className="text-white font-semibold">
                          {designElements.filter(el => el.type === 'plumbing').length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Design Impact on Quote */}
                  <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 rounded-lg p-4 border border-green-600/30">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <h4 className="text-white font-semibold">Design Materials</h4>
                    </div>
                    <p className="text-2xl font-bold text-green-400">
                      +${calculateDesignTotal().toLocaleString()}
                    </p>
                    <p className="text-gray-300 text-sm mt-1">
                      From current design elements
                    </p>
                  </div>

                  {/* Timeline */}
                  <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-[#ea580c]" />
                      <h4 className="text-white font-semibold">Timeline</h4>
                    </div>
                    <p className="text-gray-400 text-sm">Estimated Duration</p>
                    <p className="text-white font-semibold text-lg">
                      {quoteData.timeline.estimatedDays} days
                    </p>
                  </div>
                </div>
              )}

              {/* Materials Tab */}
              {activeTab === 'materials' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-semibold">Quote Materials</h4>
                    <span className="text-sm text-gray-400">
                      {quoteData.materials.length} items
                    </span>
                  </div>
                  
                  {quoteData.materials.map((material) => (
                    <div
                      key={material.id}
                      className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A] hover:border-[#3A3A3A] transition"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{material.name}</p>
                          <p className="text-gray-400 text-xs">{material.category}</p>
                        </div>
                        {material.inDesign && (
                          <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs rounded">
                            In Design
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-gray-400">
                          {material.quantity} {material.unit} @ ${material.unitPrice}
                        </span>
                        <span className="text-white font-semibold">
                          ${material.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Design-Generated Materials */}
                  {extractMaterialsFromDesign(designElements).length > 0 && (
                    <>
                      <div className="border-t border-[#2A2A2A] my-4 pt-4">
                        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-400" />
                          New from Design (Unsaved)
                        </h4>
                      </div>
                      
                      {extractMaterialsFromDesign(designElements).map((material) => (
                        <div
                          key={material.id}
                          className="bg-yellow-600/10 rounded-lg p-3 border border-yellow-600/30"
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <p className="text-white font-medium text-sm">{material.name}</p>
                              <p className="text-gray-400 text-xs">{material.category}</p>
                            </div>
                            <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs rounded">
                              New
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2 text-sm">
                            <span className="text-gray-400">
                              {material.quantity} {material.unit} @ ${material.unitPrice}
                            </span>
                            <span className="text-yellow-400 font-semibold">
                              +${material.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Labor Tab */}
              {activeTab === 'labor' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-semibold">Labor Items</h4>
                    <span className="text-sm text-gray-400">
                      {quoteData.labor.length} tasks
                    </span>
                  </div>
                  
                  {quoteData.labor.map((labor) => (
                    <div
                      key={labor.id}
                      className="bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]"
                    >
                      <p className="text-white font-medium text-sm mb-2">{labor.task}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          {labor.hours} hrs @ ${labor.rate}/hr
                        </span>
                        <span className="text-white font-semibold">
                          ${labor.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Footer Actions */}
            <div className="border-t border-[#2A2A2A] p-4 bg-[#1A1A1A] space-y-3">
              
              {/* Total */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 font-medium">Updated Total</span>
                <span className="text-white font-bold text-xl">
                  ${(quoteData.total + calculateDesignTotal()).toLocaleString()}
                </span>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveToQuote}
                disabled={syncStatus === 'synced' || syncStatus === 'saving'}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {syncStatus === 'saving' ? 'Saving...' : 'Save to Quote'}
              </button>

              {/* Return to Quote */}
              <button
                onClick={() => {
                  if (hasUnsavedChanges) {
                    setShowSaveModal(true);
                  } else {
                    onReturnToQuote();
                  }
                }}
                className="w-full px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Quote
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-600/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Unsaved Changes</h3>
                <p className="text-gray-400 text-sm">You have unsaved design changes</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Would you like to save your design changes to the quote before returning?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  onReturnToQuote();
                }}
                className="flex-1 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-medium transition"
              >
                Don't Save
              </button>
              <button
                onClick={() => {
                  handleSaveToQuote();
                  setShowSaveModal(false);
                  setTimeout(() => onReturnToQuote(), 1000);
                }}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                Save & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
