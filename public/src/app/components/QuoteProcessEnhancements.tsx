/**
 * Quote Process Enhancements
 * Materials Hub Integration + Project Schedule Builder
 * Used within QuoteToContractEditor Process tab
 */

import { useState, useEffect } from 'react';
import {
  ShoppingCart, Eye, EyeOff, Search, Package, Building2, Star, Plus,
  RefreshCw, CalendarDays, Sparkles, AlertCircle, ArrowRight, Trash2,
  CircleDot
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  materialsHubService,
  Material,
} from '../lib/services/materialsHubService';

interface MaterialItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  category: string;
  manufacturer?: string;
  visible?: boolean;
}

interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: string;
  dependencies?: string[];
}

interface ScheduleTask {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: number;
  assignedTo?: string;
  dependencies?: string[];
  status: 'not-started' | 'in-progress' | 'completed';
  color: string;
}

interface QuoteProcessEnhancementsProps {
  materials: MaterialItem[];
  processSteps: ProcessStep[];
  onMaterialsUpdate: (materials: MaterialItem[]) => void;
  workRequestId: string;
  quoteNumber?: string;
  projectTitle: string;
}

export function QuoteProcessEnhancements({
  materials,
  processSteps,
  onMaterialsUpdate,
  workRequestId,
  quoteNumber,
  projectTitle
}: QuoteProcessEnhancementsProps) {
  // Materials Hub state
  const [showMaterialsHub, setShowMaterialsHub] = useState(false);
  const [materialsHubSearch, setMaterialsHubSearch] = useState('');
  const [materialsHubCategory, setMaterialsHubCategory] = useState('all');
  const [materialsHubResults, setMaterialsHubResults] = useState<Material[]>([]);
  const [replacingMaterialId, setReplacingMaterialId] = useState<string | null>(null);

  // Schedule builder state
  const [projectSchedule, setProjectSchedule] = useState<ScheduleTask[]>([]);
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(true); // Show by default

  // Search materials hub
  const searchMaterialsHub = () => {
    const results = materialsHubService.searchMaterials(materialsHubSearch, {
      category: materialsHubCategory !== 'all' ? materialsHubCategory : undefined,
    });
    setMaterialsHubResults(results);
  };

  useEffect(() => {
    if (showMaterialsHub) {
      searchMaterialsHub();
    }
  }, [materialsHubSearch, materialsHubCategory, showMaterialsHub]);

  // Auto-generate schedule from process steps on load
  useEffect(() => {
    if (processSteps.length > 0 && projectSchedule.length === 0) {
      generateScheduleFromProcessSteps();
    }
  }, [processSteps]);

  // Replace material with hub product
  const replaceMaterialWithHubProduct = (hubMaterial: Material, originalMaterialId: string) => {
    const updated = materials.map((m) => {
      if (m.id === originalMaterialId) {
        return {
          ...m,
          name: hubMaterial.name,
          description: hubMaterial.description || m.description,
          unitCost: hubMaterial.basePrice,
          totalCost: m.quantity * hubMaterial.basePrice,
          supplier: hubMaterial.vendorName || hubMaterial.manufacturer,
          manufacturer: hubMaterial.manufacturer,
          category: hubMaterial.category,
        };
      }
      return m;
    });

    onMaterialsUpdate(updated);
    toast.success(`Replaced with ${hubMaterial.name}`);
    setReplacingMaterialId(null);
  };

  // Add material from hub
  const addMaterialFromHub = (hubMaterial: Material) => {
    const newMaterial: MaterialItem = {
      id: `m-${Date.now()}`,
      name: hubMaterial.name,
      description: hubMaterial.description || '',
      quantity: 1,
      unit: hubMaterial.unit,
      unitCost: hubMaterial.basePrice,
      totalCost: hubMaterial.basePrice,
      supplier: hubMaterial.vendorName || hubMaterial.manufacturer,
      manufacturer: hubMaterial.manufacturer,
      category: hubMaterial.category,
      visible: true,
    };

    onMaterialsUpdate([...materials, newMaterial]);
    toast.success(`Added ${hubMaterial.name} to quote`);
  };

  // Schedule functions
  const addScheduleTask = () => {
    const newTask: ScheduleTask = {
      id: `task-${Date.now()}`,
      title: 'New Task',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duration: 7,
      status: 'not-started',
      color: '#3b82f6',
    };
    setProjectSchedule([...projectSchedule, newTask]);
  };

  const updateScheduleTask = (id: string, field: keyof ScheduleTask, value: any) => {
    setProjectSchedule(projectSchedule.map(task => {
      if (task.id === id) {
        const updated = { ...task, [field]: value };
        
        if (field === 'startDate' || field === 'endDate') {
          const start = new Date(field === 'startDate' ? value : task.startDate);
          const end = new Date(field === 'endDate' ? value : task.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          updated.duration = diffDays;
        }
        
        return updated;
      }
      return task;
    }));
  };

  const deleteScheduleTask = (id: string) => {
    setProjectSchedule(projectSchedule.filter(task => task.id !== id));
    toast.info('Task removed from schedule');
  };

  const generateScheduleFromProcessSteps = () => {
    const tasks: ScheduleTask[] = [];
    let currentDate = new Date();
    
    processSteps.forEach((step, index) => {
      const duration = parseInt(step.estimatedDuration) || 1;
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + duration);
      
      tasks.push({
        id: `task-${step.id}`,
        title: step.title,
        startDate: currentDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        duration: duration,
        status: 'not-started',
        color: index % 2 === 0 ? '#3b82f6' : '#8b5cf6',
      });
      
      currentDate = new Date(endDate);
      currentDate.setDate(currentDate.getDate() + 1);
    });
    
    setProjectSchedule(tasks);
    toast.success('Schedule generated from process steps');
  };

  const exportScheduleToCalendar = () => {
    toast.success('Schedule ready for Master Scheduling', {
      description: `${projectSchedule.length} tasks prepared for scheduling system`,
    });
    localStorage.setItem('pending_project_schedule', JSON.stringify({
      workRequestId,
      quoteNumber,
      projectTitle,
      tasks: projectSchedule,
    }));
  };

  return (
    <>
      {/* MATERIALS HUB INTEGRATION */}
      <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-400" />
            Materials Hub - Product Search & Replace
          </h4>
          <button
            onClick={() => setShowMaterialsHub(!showMaterialsHub)}
            className="flex items-center gap-2 px-3 py-1.5 bg-black border border-blue-500/50 hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400 rounded-lg text-sm font-semibold transition-all"
          >
            {showMaterialsHub ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showMaterialsHub ? 'Hide' : 'Show'} Materials Hub
          </button>
        </div>

        {showMaterialsHub && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={materialsHubSearch}
                  onChange={(e) => setMaterialsHubSearch(e.target.value)}
                  placeholder="Search materials catalog (cabinets, countertops, flooring...)"
                  className="w-full pl-10 pr-4 py-2 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={materialsHubCategory}
                onChange={(e) => setMaterialsHubCategory(e.target.value)}
                className="px-4 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {materialsHubService.getCategories().map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {materialsHubResults.slice(0, 10).map((material) => (
                <div
                  key={material.id}
                  className="bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 hover:border-blue-500/50 rounded-lg p-4 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-white">{material.name}</h5>
                        {material.inStock && (
                          <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 text-green-400 text-xs rounded">
                            In Stock
                          </span>
                        )}
                        {material.qualityRating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-yellow-400">{material.qualityRating}/5</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{material.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {material.category}
                        </span>
                        {material.manufacturer && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {material.manufacturer}
                          </span>
                        )}
                        {material.vendorName && (
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" />
                            {material.vendorName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="text-xl font-bold text-blue-400">
                        ${material.basePrice.toFixed(2)}
                        <span className="text-sm text-gray-500">/{material.unit}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addMaterialFromHub(material)}
                          className="flex items-center gap-1 px-3 py-1 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded text-xs font-semibold transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                        {replacingMaterialId && (
                          <button
                            onClick={() => replaceMaterialWithHubProduct(material, replacingMaterialId)}
                            className="flex items-center gap-1 px-3 py-1 bg-black border border-orange-500/50 hover:border-orange-500 hover:shadow-[0_0_10px_rgba(234,88,12,0.3)] text-orange-400 rounded text-xs font-semibold transition-all"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Replace
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {materialsHubResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No materials found. Try different search terms.</p>
                </div>
              )}
            </div>

            {/* Current Materials - Quick Replace */}
            {materials.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                  <CircleDot className="w-4 h-4" />
                  Select material to replace:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {materials.map((mat) => (
                    <button
                      key={mat.id}
                      onClick={() => setReplacingMaterialId(mat.id === replacingMaterialId ? null : mat.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        replacingMaterialId === mat.id
                          ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400'
                          : 'bg-black border border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {mat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PROJECT SCHEDULE BUILDER */}
      <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-purple-400" />
            Proposed Project Schedule
          </h4>
          <div className="flex items-center gap-2">
            {processSteps.length > 0 && projectSchedule.length === 0 && (
              <button
                onClick={generateScheduleFromProcessSteps}
                className="flex items-center gap-2 px-3 py-1.5 bg-black border border-green-500/50 hover:border-green-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] text-green-400 rounded-lg text-sm font-semibold transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Auto-Generate from Steps
              </button>
            )}
            <button
              onClick={() => setShowScheduleBuilder(!showScheduleBuilder)}
              className="flex items-center gap-2 px-3 py-1.5 bg-black border border-purple-500/50 hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] text-purple-400 rounded-lg text-sm font-semibold transition-all"
            >
              {showScheduleBuilder ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showScheduleBuilder ? 'Hide' : 'Show'} Schedule Builder
            </button>
          </div>
        </div>

        {showScheduleBuilder && (
          <div className="space-y-4">
            {/* Schedule Actions */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-purple-300 mb-1">Schedule Integration</p>
                  <p className="text-xs text-purple-400/80">
                    Build your project timeline here. You can export it to the Master Scheduling system for team assignment and tracking.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addScheduleTask}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black border border-purple-500/50 hover:border-purple-500 text-purple-400 rounded-lg text-sm font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
                {projectSchedule.length > 0 && (
                  <button
                    onClick={exportScheduleToCalendar}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black border border-blue-500/50 hover:border-blue-500 text-blue-400 rounded-lg text-sm font-semibold transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Export to Scheduler
                  </button>
                )}
              </div>
            </div>

            {/* Schedule Tasks */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {projectSchedule.map((task, index) => (
                <div
                  key={task.id}
                  className="bg-gradient-to-r from-[#0A0A0A] to-[#1a1a1a] border border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ backgroundColor: task.color }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-12 gap-3">
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateScheduleTask(task.id, 'title', e.target.value)}
                        className="col-span-4 bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        placeholder="Task name"
                      />
                      <div className="col-span-3">
                        <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                        <input
                          type="date"
                          value={task.startDate}
                          onChange={(e) => updateScheduleTask(task.id, 'startDate', e.target.value)}
                          className="w-full bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                        <input
                          type="date"
                          value={task.endDate}
                          onChange={(e) => updateScheduleTask(task.id, 'endDate', e.target.value)}
                          className="w-full bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div className="col-span-2 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Days</label>
                          <div className="bg-black border border-gray-600 rounded px-3 py-2 text-center">
                            <span className="text-white font-semibold">{task.duration}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteScheduleTask(task.id)}
                          className="p-2 bg-black border border-red-500/50 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="col-span-12">
                        <select
                          value={task.status}
                          onChange={(e) => updateScheduleTask(task.id, 'status', e.target.value as ScheduleTask['status'])}
                          className="w-full bg-black border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        >
                          <option value="not-started">Not Started</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {projectSchedule.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                  <CalendarDays className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                  <p className="text-gray-500 mb-2">No schedule tasks yet</p>
                  <p className="text-sm text-gray-600">
                    Click "Auto-Generate" to create tasks from process steps, or "Add Task" to build manually
                  </p>
                </div>
              )}
            </div>

            {/* Visual Timeline - Gantt Chart Style */}
            {projectSchedule.length > 0 && (
              <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4">
                <h5 className="text-sm font-bold text-purple-300 mb-4 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Project Timeline
                </h5>
                <div className="space-y-2">
                  {projectSchedule.map((task, index) => {
                    const allStartDates = projectSchedule.map(t => new Date(t.startDate).getTime());
                    const allEndDates = projectSchedule.map(t => new Date(t.endDate).getTime());
                    const projectStart = Math.min(...allStartDates);
                    const projectEnd = Math.max(...allEndDates);
                    const totalDuration = projectEnd - projectStart;

                    const taskStart = new Date(task.startDate).getTime();
                    const taskEnd = new Date(task.endDate).getTime();
                    const taskDuration = taskEnd - taskStart;

                    const leftPercent = ((taskStart - projectStart) / totalDuration) * 100;
                    const widthPercent = (taskDuration / totalDuration) * 100;

                    return (
                      <div key={task.id} className="flex items-center gap-3">
                        <div className="w-48 flex-shrink-0">
                          <div className="text-xs font-semibold text-white truncate">{task.title}</div>
                          <div className="text-xs text-gray-500">{task.duration} days</div>
                        </div>
                        <div className="flex-1 relative h-8 bg-gray-800/50 rounded">
                          <div
                            className="absolute h-full rounded flex items-center justify-center text-xs font-semibold text-white"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              backgroundColor: task.color,
                              boxShadow: `0 0 10px ${task.color}50`
                            }}
                          >
                            {task.startDate} → {task.endDate}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Schedule Summary */}
            {projectSchedule.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-300 mb-1">Schedule Summary</p>
                    <p className="text-xs text-blue-400/80">
                      {projectSchedule.length} tasks • {projectSchedule.reduce((sum, t) => sum + t.duration, 0)} total days
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Start</p>
                      <p className="text-sm font-semibold text-white">
                        {projectSchedule[0]?.startDate || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">End</p>
                      <p className="text-sm font-semibold text-white">
                        {projectSchedule[projectSchedule.length - 1]?.endDate || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
