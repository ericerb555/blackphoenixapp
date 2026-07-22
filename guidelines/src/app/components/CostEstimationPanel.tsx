import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, Package, Users } from 'lucide-react';

interface StructuralElement {
  id: string;
  type: 'beam' | 'column' | 'foundation' | 'slab';
  width: number;
  height: number;
  properties: any;
}

interface CostEstimationPanelProps {
  elements: StructuralElement[];
  selectedElementId: string | null;
}

// Cost database (price per unit)
const MATERIAL_COSTS = {
  beam: {
    'Reinforced Concrete': 450, // per linear foot
    'Steel': 850,
    'Timber': 180,
  },
  column: {
    'Reinforced Concrete': 650, // per column
    'Steel': 1200,
    'Timber': 280,
  },
  foundation: {
    'Concrete': 35, // per sq ft
    'Reinforced Concrete': 55,
  },
  slab: {
    'Concrete': 6, // per sq ft
    'Reinforced Concrete': 9,
  },
};

const LABOR_RATES = {
  beam: 85, // per hour
  column: 95,
  foundation: 75,
  slab: 65,
};

const LABOR_HOURS = {
  beam: 4, // hours per element
  column: 6,
  foundation: 8,
  slab: 0.5, // per 100 sq ft
};

export function CostEstimationPanel({ elements, selectedElementId }: CostEstimationPanelProps) {
  const costBreakdown = useMemo(() => {
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    const breakdown: any[] = [];

    elements.forEach(element => {
      const material = element.properties?.material || 'Reinforced Concrete';
      const area = (element.width * element.height) / 400; // Convert pixels to sq ft (approximate)
      
      let materialCost = 0;
      let laborCost = 0;

      if (element.type === 'beam') {
        const length = Math.max(element.width, element.height) / 20; // pixels to feet
        materialCost = (MATERIAL_COSTS.beam[material as keyof typeof MATERIAL_COSTS.beam] || 450) * length;
        laborCost = LABOR_RATES.beam * LABOR_HOURS.beam;
      } else if (element.type === 'column') {
        materialCost = MATERIAL_COSTS.column[material as keyof typeof MATERIAL_COSTS.column] || 650;
        laborCost = LABOR_RATES.column * LABOR_HOURS.column;
      } else if (element.type === 'foundation') {
        materialCost = (MATERIAL_COSTS.foundation[material as keyof typeof MATERIAL_COSTS.foundation] || 35) * area;
        laborCost = LABOR_RATES.foundation * LABOR_HOURS.foundation;
      } else if (element.type === 'slab') {
        materialCost = (MATERIAL_COSTS.slab[material as keyof typeof MATERIAL_COSTS.slab] || 6) * area;
        laborCost = LABOR_RATES.slab * LABOR_HOURS.slab * (area / 100);
      }

      totalMaterialCost += materialCost;
      totalLaborCost += laborCost;

      breakdown.push({
        id: element.id,
        label: element.properties?.label || `${element.type} ${element.id.slice(-4)}`,
        type: element.type,
        material,
        materialCost,
        laborCost,
        total: materialCost + laborCost,
      });
    });

    const subtotal = totalMaterialCost + totalLaborCost;
    const overhead = subtotal * 0.15; // 15% overhead
    const profit = subtotal * 0.10; // 10% profit margin
    const total = subtotal + overhead + profit;

    return {
      breakdown,
      totalMaterialCost,
      totalLaborCost,
      subtotal,
      overhead,
      profit,
      total,
    };
  }, [elements]);

  const selectedElementCost = selectedElementId 
    ? costBreakdown.breakdown.find(b => b.id === selectedElementId)
    : null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-green-500" />
        Cost Estimation
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-[#2A2A2A] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Material Cost</div>
          <div className="text-lg font-bold text-blue-400">
            ${costBreakdown.totalMaterialCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Labor Cost</div>
          <div className="text-lg font-bold text-yellow-400">
            ${costBreakdown.totalLaborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Selected Element Cost */}
      {selectedElementCost && (
        <div className="bg-orange-600/20 border border-orange-600/30 rounded-lg p-3 mb-4">
          <div className="text-xs font-semibold text-orange-400 mb-2">Selected Element</div>
          <div className="text-sm mb-1">{selectedElementCost.label}</div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Material:</span>
            <span className="text-blue-400">${selectedElementCost.materialCost.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Labor:</span>
            <span className="text-yellow-400">${selectedElementCost.laborCost.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs pt-2 border-t border-orange-600/30 mt-2 font-semibold">
            <span>Total:</span>
            <span className="text-green-400">${selectedElementCost.total.toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Total Cost Breakdown */}
      <div className="bg-[#2A2A2A] rounded-lg p-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Subtotal:</span>
          <span>${costBreakdown.subtotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Overhead (15%):</span>
          <span>${costBreakdown.overhead.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Profit (10%):</span>
          <span>${costBreakdown.profit.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-[#3A3A3A] font-bold text-base">
          <span className="text-green-400">Total Estimate:</span>
          <span className="text-green-400">${costBreakdown.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Cost by Type */}
      <div className="mt-4">
        <div className="text-xs font-semibold text-gray-400 mb-2">Cost by Element Type</div>
        <div className="space-y-2 text-xs">
          {['beam', 'column', 'foundation', 'slab'].map(type => {
            const typeCost = costBreakdown.breakdown
              .filter(b => b.type === type)
              .reduce((sum, b) => sum + b.total, 0);
            const count = elements.filter(e => e.type === type).length;
            
            if (count === 0) return null;
            
            return (
              <div key={type} className="flex items-center justify-between bg-[#2A2A2A] rounded p-2">
                <div className="flex items-center gap-2">
                  <Package className="w-3 h-3 text-orange-500" />
                  <span className="capitalize">{type}s ({count})</span>
                </div>
                <span className="font-semibold">${typeCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost Metrics */}
      <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
        <div className="text-xs font-semibold text-gray-400 mb-2">Project Metrics</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Avg Cost per Element:</span>
            <span className="text-blue-400">
              ${elements.length > 0 ? (costBreakdown.total / elements.length).toLocaleString('en-US', { maximumFractionDigits: 0 }) : 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Material %:</span>
            <span className="text-blue-400">
              {costBreakdown.total > 0 ? ((costBreakdown.totalMaterialCost / costBreakdown.total) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Labor %:</span>
            <span className="text-yellow-400">
              {costBreakdown.total > 0 ? ((costBreakdown.totalLaborCost / costBreakdown.total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      {elements.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No elements to estimate. Start drawing structural elements.
        </div>
      )}
    </div>
  );
}
