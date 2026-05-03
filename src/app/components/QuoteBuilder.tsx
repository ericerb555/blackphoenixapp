import { useState } from 'react';
import {
  Package, Wrench, Palette, Plus, Trash2, Save, Send, Eye,
  DollarSign, Percent, Calculator, FileText, Image as ImageIcon,
  Upload, ChevronDown, ChevronRight, Edit, Check, X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { TextArea } from './ui/input/TextArea';
import { QuoteKitchenLayoutButton } from './QuoteKitchenLayoutButton';

interface QuoteBuilderProps {
  workRequestId?: number;
  customerId?: number;
  onSave?: (quote: any) => void;
  onCancel?: () => void;
  serviceType?: string; // Add service type for kitchen detection
}

export default function QuoteBuilder({ workRequestId, customerId, onSave, onCancel, serviceType }: QuoteBuilderProps) {
  const [quoteDetails, setQuoteDetails] = useState({
    title: '',
    description: '',
    projectScope: '',
    validUntil: '',
    paymentTerms: 'Net 30',
    warrantyTerms: '1 year warranty on labor and materials',
  });

  const [materials, setMaterials] = useState<any[]>([
    { id: 1, name: 'Cabinet Set - Premium Oak', quantity: 1, unit: 'set', cost: 4500, markup: 30, price: 5850, total: 5850 },
    { id: 2, name: 'Countertop - Granite', quantity: 25, unit: 'sq ft', cost: 45, markup: 40, price: 63, total: 1575 },
  ]);

  const [labor, setLabor] = useState<any[]>([
    { id: 1, type: 'Installation', description: 'Cabinet installation', hours: 40, rate: 85, markup: 0, total: 3400 },
    { id: 2, type: 'Plumbing', description: 'Plumbing work', hours: 16, rate: 95, markup: 0, total: 1520 },
  ]);

  const [designFees, setDesignFees] = useState(2500);
  const [permitFees, setPermitFees] = useState(350);
  const [otherFees, setOtherFees] = useState(0);
  const [taxRate, setTaxRate] = useState(8.5);
  const [discountAmount, setDiscountAmount] = useState(0);

  const [hasDesigns, setHasDesigns] = useState(true);
  const [hasFloorPlans, setHasFloorPlans] = useState(true);
  const [designFiles, setDesignFiles] = useState<string[]>(['Kitchen_Design_3D.pdf', 'Color_Scheme.pdf']);
  const [planFiles, setPlanFiles] = useState<string[]>(['Floor_Plan.pdf']);

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showLaborForm, setShowLaborForm] = useState(false);

  // Calculate totals
  const materialsSubtotal = materials.reduce((sum, item) => sum + item.total, 0);
  const laborSubtotal = labor.reduce((sum, item) => sum + item.total, 0);
  const subtotal = materialsSubtotal + laborSubtotal + designFees + permitFees + otherFees;
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const totalAmount = subtotal - discountAmount + taxAmount;

  const handleAddMaterial = () => {
    const newMaterial = {
      id: Date.now(),
      name: '',
      quantity: 1,
      unit: 'ea',
      cost: 0,
      markup: 30,
      price: 0,
      total: 0,
    };
    setMaterials([...materials, newMaterial]);
    setShowMaterialForm(false);
  };

  const handleUpdateMaterial = (id: number, field: string, value: any) => {
    setMaterials(materials.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'cost' || field === 'markup') {
          updated.price = updated.cost * (1 + updated.markup / 100);
        }
        if (field === 'quantity' || field === 'price') {
          updated.total = updated.quantity * updated.price;
        }
        return updated;
      }
      return m;
    }));
  };

  const handleRemoveMaterial = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleAddLabor = () => {
    const newLabor = {
      id: Date.now(),
      type: 'Installation',
      description: '',
      hours: 0,
      rate: 85,
      markup: 0,
      total: 0,
    };
    setLabor([...labor, newLabor]);
    setShowLaborForm = false;
  };

  const handleUpdateLabor = (id: number, field: string, value: any) => {
    setLabor(labor.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value };
        updated.total = updated.hours * updated.rate * (1 + updated.markup / 100);
        return updated;
      }
      return l;
    }));
  };

  const handleRemoveLabor = (id: number) => {
    setLabor(labor.filter(l => l.id !== id));
  };

  const handleSaveQuote = () => {
    const quote = {
      ...quoteDetails,
      materials,
      labor,
      designFees,
      permitFees,
      otherFees,
      materialsSubtotal,
      laborSubtotal,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      totalAmount,
      hasDesigns,
      hasFloorPlans,
      designFiles,
      planFiles,
    };

    toast.success('Quote saved successfully!');
    if (onSave) onSave(quote);
  };

  const handleSendQuote = () => {
    toast.success('Quote sent to customer!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Build Quote</h2>
          <p className="text-gray-400">Create detailed quote with materials, labor, and designs</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Kitchen Layout Button - Shows for kitchen-related projects */}
          <QuoteKitchenLayoutButton
            quoteId={workRequestId?.toString() || 'new'}
            workRequestId={workRequestId?.toString()}
            serviceType={serviceType}
            onLayoutGenerated={(data) => {
              console.log('Kitchen layout generated:', data);
              toast.success('Kitchen layout and cabinet schedule added to quote!');
            }}
          />
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] text-gray-400 rounded-lg transition border border-[#2A2A2A]"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSaveQuote}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg transition border border-blue-500/20"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 rounded-lg transition border border-purple-500/20">
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={handleSendQuote}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition shadow-lg shadow-orange-500/20"
          >
            <Send className="w-4 h-4" />
            Send to Customer
          </button>
        </div>
      </div>

      {/* Quote Details */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quote Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Project Title</label>
            <input
              type="text"
              value={quoteDetails.title}
              onChange={(e) => setQuoteDetails({ ...quoteDetails, title: e.target.value })}
              placeholder="Kitchen Renovation - Smith Residence"
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Valid Until</label>
            <input
              type="date"
              value={quoteDetails.validUntil}
              onChange={(e) => setQuoteDetails({ ...quoteDetails, validUntil: e.target.value })}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">Project Scope</label>
            <TextArea
              value={quoteDetails.projectScope}
              onChange={(value) => setQuoteDetails({ ...quoteDetails, projectScope: value })}
              placeholder="Complete kitchen renovation including cabinet installation, countertops, plumbing..."
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Materials Section */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Materials</h3>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-sm font-semibold">
              ${materialsSubtotal.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleAddMaterial}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg transition border border-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Material
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-4 text-xs font-semibold text-gray-500">
            <div className="col-span-3">Material</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-1 text-center">Unit</div>
            <div className="col-span-2 text-right">Cost</div>
            <div className="col-span-1 text-right">Markup</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          {materials.map((material) => (
            <div key={material.id} className="grid grid-cols-12 gap-2 p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] items-center">
              <div className="col-span-3">
                <input
                  type="text"
                  value={material.name}
                  onChange={(e) => handleUpdateMaterial(material.id, 'name', e.target.value)}
                  placeholder="Material name"
                  className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm"
                />
              </div>
              <div className="col-span-1">
                <input
                  type="number"
                  value={material.quantity}
                  onChange={(e) => handleUpdateMaterial(material.id, 'quantity', parseFloat(e.target.value))}
                  className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm text-center"
                />
              </div>
              <div className="col-span-1">
                <input
                  type="text"
                  value={material.unit}
                  onChange={(e) => handleUpdateMaterial(material.id, 'unit', e.target.value)}
                  className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm text-center"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={material.cost}
                  onChange={(e) => handleUpdateMaterial(material.id, 'cost', parseFloat(e.target.value))}
                  className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm text-right"
                />
              </div>
              <div className="col-span-1">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={material.markup}
                    onChange={(e) => handleUpdateMaterial(material.id, 'markup', parseFloat(e.target.value))}
                    className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm text-right"
                  />
                  <Percent className="w-3 h-3 text-gray-500" />
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-white font-semibold">${material.price.toFixed(2)}</span>
              </div>
              <div className="col-span-2 text-right flex items-center justify-end gap-2">
                <span className="text-white font-bold">${material.total.toLocaleString()}</span>
                <button
                  onClick={() => handleRemoveMaterial(material.id)}
                  className="p-1 hover:bg-red-500/10 rounded text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Labor Section */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Labor</h3>
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-sm font-semibold">
              ${laborSubtotal.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleAddLabor}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600/10 hover:bg-green-600/20 text-green-400 rounded-lg transition border border-green-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Labor
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-4 text-xs font-semibold text-gray-500">
            <div className="col-span-2">Type</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-2 text-right">Hours</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          {labor.map((laborItem) => (
            <div key={laborItem.id} className="grid grid-cols-12 gap-2 p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] items-center">
              <div className="col-span-2">
                <select
                  value={laborItem.type}
                  onChange={(e) => handleUpdateLabor(laborItem.id, 'type', e.target.value)}
                  className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm"
                >
                  <option>Installation</option>
                  <option>Plumbing</option>
                  <option>Electrical</option>
                  <option>Carpentry</option>
                  <option>Painting</option>
                </select>
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  value={laborItem.description}
                  onChange={(e) => handleUpdateLabor(laborItem.id, 'description', e.target.value)}
                  placeholder="Labor description"
                  className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={laborItem.hours}
                  onChange={(e) => handleUpdateLabor(laborItem.id, 'hours', parseFloat(e.target.value))}
                  className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm text-right"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  value={laborItem.rate}
                  onChange={(e) => handleUpdateLabor(laborItem.id, 'rate', parseFloat(e.target.value))}
                  className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm text-right"
                />
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <span className="text-white font-bold">${laborItem.total.toLocaleString()}</span>
                <button
                  onClick={() => handleRemoveLabor(laborItem.id)}
                  className="p-1 hover:bg-red-500/10 rounded text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Designs & Plans */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Designs & Floor Plans</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={hasDesigns}
                onChange={(e) => setHasDesigns(e.target.checked)}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium text-gray-300">Include Design Renderings</label>
            </div>
            {hasDesigns && (
              <div className="space-y-2">
                {designFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">{file}</span>
                    </div>
                    <button className="p-1 hover:bg-red-500/10 rounded text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[#2A2A2A] rounded-lg text-gray-400 hover:border-purple-500/30 hover:text-purple-400 transition">
                  <Upload className="w-4 h-4" />
                  Upload Design Files
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={hasFloorPlans}
                onChange={(e) => setHasFloorPlans(e.target.checked)}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium text-gray-300">Include Floor Plans</label>
            </div>
            {hasFloorPlans && (
              <div className="space-y-2">
                {planFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-300">{file}</span>
                    </div>
                    <button className="p-1 hover:bg-red-500/10 rounded text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-[#2A2A2A] rounded-lg text-gray-400 hover:border-green-500/30 hover:text-green-400 transition">
                  <Upload className="w-4 h-4" />
                  Upload Floor Plans
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Fees & Totals */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Additional Fees & Totals</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Design Fees</label>
              <input
                type="number"
                value={designFees}
                onChange={(e) => setDesignFees(parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Permit Fees</label>
              <input
                type="number"
                value={permitFees}
                onChange={(e) => setPermitFees(parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white"
              />
            </div>
          </div>

          {/* Totals Summary */}
          <div className="p-6 bg-gradient-to-br from-orange-600/10 to-orange-700/10 rounded-xl border border-orange-500/30">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-gray-300">
                <span>Materials Subtotal</span>
                <span className="font-semibold">${materialsSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Labor Subtotal</span>
                <span className="font-semibold">${laborSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Design Fees</span>
                <span className="font-semibold">${designFees.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Permit Fees</span>
                <span className="font-semibold">${permitFees.toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t border-orange-500/20">
                <div className="flex items-center justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span className="font-bold text-white">${subtotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <div className="flex items-center gap-2">
                  <span>Tax</span>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                    className="w-16 px-2 py-1 bg-[#0A0A0A] border border-orange-500/30 rounded text-white text-sm text-right"
                  />
                  <Percent className="w-4 h-4 text-gray-500" />
                </div>
                <span className="font-semibold">${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Discount</span>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value))}
                  className="w-32 px-3 py-1 bg-[#0A0A0A] border border-orange-500/30 rounded text-white text-right"
                />
              </div>
              <div className="pt-3 border-t border-orange-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-white">Total Amount</span>
                  <span className="text-2xl font-bold text-orange-400">${totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}