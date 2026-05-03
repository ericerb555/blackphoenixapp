/**
 * Kitchen Layout Analysis Component
 * 
 * Analyzes kitchen videos/images to generate:
 * - Kitchen floor plans
 * - Cabinet schedules
 * - Material takeoffs
 * - Cost estimates
 */

import { useState } from 'react';
import {
  Upload, Camera, FileImage, Loader2, CheckCircle, AlertCircle,
  X, Download, Printer, Eye, ChevronRight, DollarSign, Ruler,
  Package, Hammer, Layout, Clock
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface KitchenLayoutAnalysisProps {
  onClose?: () => void;
  onAnalysisComplete?: (data: KitchenAnalysisResult) => void;
  workRequestId?: string;
}

interface KitchenAnalysisResult {
  floorPlan: any;
  cabinetSchedule: any;
  imageUrl?: string;
}

export function KitchenLayoutAnalysis({ 
  onClose, 
  onAnalysisComplete,
  workRequestId 
}: KitchenLayoutAnalysisProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<KitchenAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'floorplan' | 'schedule' | 'materials'>('upload');
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setSelectedImage(file);
    setError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data:image/xxx;base64, prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const analyzeKitchen = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      console.log('🔍 Starting kitchen analysis...');

      // Step 1: Analyze kitchen layout
      const base64Image = await convertImageToBase64(selectedImage);
      
      const floorPlanResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/ai-floorplan/analyze-kitchen`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            imageBase64: base64Image,
            analysisType: 'full-analysis'
          })
        }
      );

      if (!floorPlanResponse.ok) {
        const errorData = await floorPlanResponse.json();
        throw new Error(errorData.error || 'Failed to analyze kitchen layout');
      }

      const floorPlanData = await floorPlanResponse.json();
      console.log('✅ Kitchen layout analyzed:', floorPlanData);

      // Step 2: Generate cabinet schedule
      if (floorPlanData.success && floorPlanData.project.kitchenData) {
        console.log('🔨 Generating cabinet schedule...');
        
        const scheduleResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/cabinet-schedule/generate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              kitchenData: floorPlanData.project.kitchenData,
              projectName: workRequestId ? `Work Request ${workRequestId}` : 'Kitchen Remodel',
              clientName: 'Client',
              includeHardware: true,
              includeInstallation: true,
              pricingLevel: 'mid-range'
            })
          }
        );

        if (!scheduleResponse.ok) {
          const errorData = await scheduleResponse.json();
          throw new Error(errorData.error || 'Failed to generate cabinet schedule');
        }

        const scheduleData = await scheduleResponse.json();
        console.log('✅ Cabinet schedule generated:', scheduleData);

        const result: KitchenAnalysisResult = {
          floorPlan: floorPlanData.project,
          cabinetSchedule: scheduleData.schedule,
          imageUrl: imagePreview || undefined
        };

        setAnalysisResult(result);
        setActiveTab('floorplan');
        toast.success('Kitchen analysis complete!');

        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      } else {
        throw new Error('No kitchen data found in analysis result');
      }

    } catch (err: any) {
      console.error('Error analyzing kitchen:', err);
      setError(err.message || 'Failed to analyze kitchen');
      toast.error(err.message || 'Failed to analyze kitchen');
    } finally {
      setAnalyzing(false);
    }
  };

  const renderUploadTab = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Upload Kitchen Image</h3>
        <p className="text-gray-400 mb-6">
          Upload a photo or video frame of the kitchen to analyze layout and generate cabinet schedules
        </p>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative rounded-lg overflow-hidden border-2 border-[#ea580c]/30">
          <img 
            src={imagePreview} 
            alt="Kitchen preview" 
            className="w-full h-auto max-h-[400px] object-contain bg-[#1a1a1a]"
          />
          <button
            onClick={() => {
              setSelectedImage(null);
              setImagePreview(null);
            }}
            className="absolute top-2 right-2 p-2 bg-black/80 rounded-lg hover:bg-black transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Upload Button */}
      {!imagePreview && (
        <label className="block">
          <div className="border-2 border-dashed border-[#ea580c]/30 rounded-lg p-12 hover:border-[#ea580c]/50 transition-colors cursor-pointer bg-[#0A0A0A]/50">
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-[#ea580c]" />
              <p className="text-white font-semibold mb-2">Click to upload kitchen image</p>
              <p className="text-gray-400 text-sm">PNG, JPG, or JPEG up to 10MB</p>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </label>
      )}

      {/* Analyze Button */}
      {selectedImage && (
        <Button
          onClick={analyzeKitchen}
          disabled={analyzing}
          className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white py-6"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing Kitchen...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 mr-2" />
              Analyze Kitchen Layout
            </>
          )}
        </Button>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold mb-1">Analysis Failed</p>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderFloorPlanTab = () => {
    if (!analysisResult?.floorPlan) return null;

    const { kitchenData } = analysisResult.floorPlan;
    if (!kitchenData) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Kitchen Floor Plan</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              3D View
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Room Dimensions */}
        <Card className="bg-[#1a1a1a] border-[#ea580c]/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Ruler className="w-5 h-5 text-[#ea580c]" />
            <h4 className="text-lg font-semibold text-white">Room Dimensions</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Width</p>
              <p className="text-white text-xl font-bold">{kitchenData.roomDimensions.width}"</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Length</p>
              <p className="text-white text-xl font-bold">{kitchenData.roomDimensions.length}"</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Height</p>
              <p className="text-white text-xl font-bold">{kitchenData.roomDimensions.height}"</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Area</p>
              <p className="text-white text-xl font-bold">{Math.round(kitchenData.roomDimensions.area / 144)} sq ft</p>
            </div>
          </div>
        </Card>

        {/* Layout Type */}
        <Card className="bg-[#1a1a1a] border-[#ea580c]/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Layout className="w-5 h-5 text-[#ea580c]" />
            <h4 className="text-lg font-semibold text-white">Kitchen Layout</h4>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Layout Type</p>
              <p className="text-white text-lg font-semibold capitalize">
                {kitchenData.layout.type.replace('-', ' ')}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Work Triangle Efficiency</p>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#ea580c]" 
                    style={{ width: `${kitchenData.layout.workTriangle.efficiency}%` }}
                  />
                </div>
                <span className="text-white font-semibold">
                  {kitchenData.layout.workTriangle.efficiency}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Cabinets Summary */}
        <Card className="bg-[#1a1a1a] border-[#ea580c]/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-[#ea580c]" />
            <h4 className="text-lg font-semibold text-white">Cabinets Summary</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(
              kitchenData.cabinets.reduce((acc: any, cab: any) => {
                acc[cab.type] = (acc[cab.type] || 0) + 1;
                return acc;
              }, {})
            ).map(([type, count]) => (
              <div key={type} className="bg-[#0A0A0A]/50 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1 capitalize">{type}</p>
                <p className="text-white text-2xl font-bold">{count as number}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Continue to Schedule */}
        <Button
          onClick={() => setActiveTab('schedule')}
          className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white py-6"
        >
          View Cabinet Schedule
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    );
  };

  const renderScheduleTab = () => {
    if (!analysisResult?.cabinetSchedule) return null;

    const schedule = analysisResult.cabinetSchedule;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Cabinet Schedule</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Cost Summary */}
        <Card className="bg-gradient-to-br from-[#ea580c]/20 to-[#ea580c]/5 border-[#ea580c]/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-[#ea580c]" />
              <h4 className="text-lg font-semibold text-white">Total Project Cost</h4>
            </div>
            <p className="text-3xl font-bold text-[#ea580c]">
              ${schedule.summary.grandTotal.toLocaleString()}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#ea580c]/20">
            <div>
              <p className="text-gray-400 text-sm mb-1">Cabinets</p>
              <p className="text-white font-semibold">
                ${schedule.summary.cabinetCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Hardware</p>
              <p className="text-white font-semibold">
                ${schedule.summary.hardwareCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Countertops</p>
              <p className="text-white font-semibold">
                ${schedule.summary.countertopCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Installation</p>
              <p className="text-white font-semibold">
                ${schedule.summary.installationCost.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Cabinets Table */}
        <Card className="bg-[#1a1a1a] border-[#ea580c]/20 p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Cabinet Details</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-400 font-semibold">Mark</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-semibold">Type</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-semibold">Location</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-semibold">Width</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {schedule.cabinets.slice(0, 10).map((cabinet: any) => (
                  <tr key={cabinet.id} className="border-b border-gray-800 hover:bg-[#0A0A0A]/50">
                    <td className="py-3 px-2 text-[#ea580c] font-mono font-semibold">{cabinet.mark}</td>
                    <td className="py-3 px-2 text-white">{cabinet.type}</td>
                    <td className="py-3 px-2 text-gray-400">{cabinet.location}</td>
                    <td className="py-3 px-2 text-right text-white">{cabinet.width}"</td>
                    <td className="py-3 px-2 text-right text-white font-semibold">
                      ${cabinet.totalCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {schedule.cabinets.length > 10 && (
            <p className="text-gray-400 text-sm mt-4 text-center">
              Showing 10 of {schedule.cabinets.length} cabinets
            </p>
          )}
        </Card>

        {/* Installation Timeline */}
        <Card className="bg-[#1a1a1a] border-[#ea580c]/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-[#ea580c]" />
            <h4 className="text-lg font-semibold text-white">Installation Timeline</h4>
          </div>
          <div className="space-y-3">
            {schedule.installation.slice(0, 5).map((step: any) => (
              <div key={step.sequence} className="flex items-start gap-4 p-4 bg-[#0A0A0A]/50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-[#ea580c] rounded-full flex-shrink-0">
                  <span className="text-white font-bold text-sm">{step.sequence}</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold mb-1">{step.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{step.estimatedTime} hours</span>
                    <span>•</span>
                    <span>${step.laborCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* View Materials */}
        <Button
          onClick={() => setActiveTab('materials')}
          variant="outline"
          className="w-full py-6"
        >
          <Hammer className="w-5 h-5 mr-2" />
          View Material Takeoff
        </Button>
      </div>
    );
  };

  const renderMaterialsTab = () => {
    if (!analysisResult?.cabinetSchedule) return null;

    const schedule = analysisResult.cabinetSchedule;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Material Takeoff</h3>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {/* Material Takeoff Table */}
        <Card className="bg-[#1a1a1a] border-[#ea580c]/20 p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-400 font-semibold">Category</th>
                  <th className="text-left py-3 px-2 text-gray-400 font-semibold">Description</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-semibold">Qty</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-semibold">Unit</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-semibold">Unit Cost</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {schedule.materialTakeoff.map((material: any, index: number) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-[#0A0A0A]/50">
                    <td className="py-3 px-2 text-[#ea580c] font-semibold">{material.category}</td>
                    <td className="py-3 px-2 text-white">{material.description}</td>
                    <td className="py-3 px-2 text-right text-white">{material.quantity}</td>
                    <td className="py-3 px-2 text-right text-gray-400">{material.unit}</td>
                    <td className="py-3 px-2 text-right text-white">
                      ${material.unitCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-white font-semibold">
                      ${material.totalCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#ea580c]/30 font-bold">
                  <td colSpan={5} className="py-3 px-2 text-right text-white">Materials Subtotal:</td>
                  <td className="py-3 px-2 text-right text-[#ea580c] text-lg">
                    ${schedule.materialTakeoff.reduce((sum: number, m: any) => sum + m.totalCost, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Hardware Schedule */}
        {schedule.hardware.length > 0 && (
          <Card className="bg-[#1a1a1a] border-[#ea580c]/20 p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Hardware Schedule</h4>
            <div className="space-y-3">
              {schedule.hardware.map((hw: any) => (
                <div key={hw.id} className="flex items-center justify-between p-4 bg-[#0A0A0A]/50 rounded-lg">
                  <div>
                    <p className="text-white font-semibold">{hw.description}</p>
                    <p className="text-gray-400 text-sm">{hw.finish} - Qty: {hw.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${hw.totalCost.toLocaleString()}</p>
                    <p className="text-gray-400 text-sm">${hw.unitCost} each</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-6xl bg-[#1a1a1a] rounded-xl border border-[#ea580c]/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#ea580c] to-[#c2410c] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className="w-8 h-8 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Kitchen Layout Analysis</h2>
                  <p className="text-orange-100 text-sm">AI-powered floor plans and cabinet schedules</p>
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-[#0A0A0A] border-b border-[#ea580c]/20">
            <div className="flex gap-1 p-2">
              {[
                { id: 'upload', label: 'Upload Image', icon: Upload },
                { id: 'floorplan', label: 'Floor Plan', icon: Layout, disabled: !analysisResult },
                { id: 'schedule', label: 'Cabinet Schedule', icon: Package, disabled: !analysisResult },
                { id: 'materials', label: 'Materials', icon: Hammer, disabled: !analysisResult }
              ].map(({ id, label, icon: Icon, disabled }) => (
                <button
                  key={id}
                  onClick={() => !disabled && setActiveTab(id as any)}
                  disabled={disabled}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === id
                      ? 'bg-[#ea580c] text-white'
                      : disabled
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'upload' && renderUploadTab()}
            {activeTab === 'floorplan' && renderFloorPlanTab()}
            {activeTab === 'schedule' && renderScheduleTab()}
            {activeTab === 'materials' && renderMaterialsTab()}
          </div>
        </div>
      </div>
    </div>
  );
}
