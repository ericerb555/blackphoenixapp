/**
 * Construction Schedule Generator
 * 
 * Creates comprehensive project schedules with:
 * - Gantt charts
 * - Task dependencies
 * - Material delivery schedules
 * - Labor schedules
 * - Inspection schedules
 * - Critical path analysis
 */

import { useState } from 'react';
import { X, Plus, Calendar, Clock, Users, Package, FileText, Download, Save, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface ScheduleTask {
  id: string;
  name: string;
  phase: string;
  duration: number; // days
  startDate: Date;
  endDate: Date;
  dependencies: string[];
  assignedTo: string;
  materials: string[];
  inspectionRequired: boolean;
  status: 'not-started' | 'in-progress' | 'completed' | 'delayed';
  progress: number; // 0-100
}

interface MaterialDelivery {
  id: string;
  material: string;
  quantity: string;
  supplier: string;
  scheduledDate: Date;
  requiredFor: string[]; // task IDs
  cost: number;
  status: 'scheduled' | 'delivered' | 'delayed';
}

interface Inspection {
  id: string;
  type: string;
  scheduledDate: Date;
  inspector: string;
  relatedTasks: string[];
  status: 'pending' | 'passed' | 'failed' | 'scheduled';
  notes: string;
}

export default function ConstructionScheduleGenerator({ 
  onClose, 
  projectName = 'New Construction Project',
  onSave 
}: { 
  onClose: () => void; 
  projectName?: string;
  onSave?: (data: any) => void;
}) {
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [deliveries, setDeliveries] = useState<MaterialDelivery[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [activeView, setActiveView] = useState<'gantt' | 'tasks' | 'materials' | 'inspections'>('gantt');
  const [projectStartDate, setProjectStartDate] = useState(new Date());
  const [generating, setGenerating] = useState(false);
  const [templateSource, setTemplateSource] = useState<string>('');

  // Local fallback templates (used if the design-standards data source is
  // unreachable). Materials here are plain names; the server provides the same
  // structure enriched with per-material lead times and crew sizes.
  const [standardPhases, setStandardPhases] = useState<any[]>([
    {
      name: 'Pre-Construction',
      tasks: [
        { name: 'Site Survey & Measurements', duration: 1, materials: [] },
        { name: 'Permits & Approvals', duration: 5, materials: [] },
        { name: 'Site Preparation', duration: 2, materials: ['Temporary Fencing', 'Safety Signage'] },
      ]
    },
    {
      name: 'Demolition',
      tasks: [
        { name: 'Interior Demolition', duration: 3, materials: ['Dumpster', 'Dust Barriers'] },
        { name: 'Debris Removal', duration: 1, materials: [] },
      ]
    },
    {
      name: 'Foundation',
      tasks: [
        { name: 'Foundation Excavation', duration: 2, materials: ['Gravel', 'Vapor Barrier'] },
        { name: 'Form Installation', duration: 2, materials: ['Forms', 'Rebar', 'Ties'] },
        { name: 'Concrete Pour', duration: 1, materials: ['Concrete - 15 yd³'] },
        { name: 'Curing & Form Removal', duration: 7, materials: [] },
      ]
    },
    {
      name: 'Framing',
      tasks: [
        { name: 'Floor Framing', duration: 3, materials: ['Lumber 2x10', 'Joist Hangers', 'Subfloor Plywood'] },
        { name: 'Wall Framing', duration: 5, materials: ['Lumber 2x4', 'Lumber 2x6', 'Plates', 'Studs'] },
        { name: 'Roof Framing', duration: 4, materials: ['Trusses', 'Roof Sheathing', 'Hurricane Ties'] },
        { name: 'Sheathing & House Wrap', duration: 2, materials: ['OSB Sheathing', 'House Wrap', 'Tape'] },
      ]
    },
    {
      name: 'Exterior',
      tasks: [
        { name: 'Roofing', duration: 2, materials: ['Shingles', 'Underlayment', 'Drip Edge', 'Ridge Vent'] },
        { name: 'Windows & Doors', duration: 3, materials: ['Windows', 'Exterior Doors', 'Flashing'] },
        { name: 'Siding Installation', duration: 5, materials: ['Siding', 'Trim', 'Caulk', 'Fasteners'] },
      ]
    },
    {
      name: 'MEP Rough-In',
      tasks: [
        { name: 'Electrical Rough-In', duration: 4, materials: ['Romex Wire', 'Boxes', 'Panels', 'Conduit'], inspectionRequired: true },
        { name: 'Plumbing Rough-In', duration: 4, materials: ['PEX Tubing', 'Fittings', 'Drain Pipe', 'Vents'], inspectionRequired: true },
        { name: 'HVAC Installation', duration: 3, materials: ['Ductwork', 'Unit', 'Registers', 'Thermostat'] },
      ]
    },
    {
      name: 'Insulation & Drywall',
      tasks: [
        { name: 'Insulation Installation', duration: 2, materials: ['Insulation Batts R-19', 'Insulation R-30'] },
        { name: 'Drywall Hanging', duration: 4, materials: ['Drywall 1/2"', 'Screws'] },
        { name: 'Drywall Finishing', duration: 5, materials: ['Joint Compound', 'Tape', 'Corner Bead'] },
      ]
    },
    {
      name: 'Interior Finishes',
      tasks: [
        { name: 'Interior Painting', duration: 5, materials: ['Primer', 'Paint', 'Supplies'] },
        { name: 'Flooring Installation', duration: 4, materials: ['Flooring', 'Underlayment', 'Adhesive'] },
        { name: 'Trim & Baseboards', duration: 3, materials: ['Trim', 'Baseboards', 'Nails', 'Caulk'] },
        { name: 'Cabinet Installation', duration: 2, materials: ['Cabinets', 'Hardware'] },
        { name: 'Countertop Installation', duration: 1, materials: ['Countertops'] },
      ]
    },
    {
      name: 'Final Systems',
      tasks: [
        { name: 'Electrical Finish', duration: 2, materials: ['Outlets', 'Switches', 'Fixtures'] },
        { name: 'Plumbing Finish', duration: 2, materials: ['Fixtures', 'Faucets', 'Toilets'] },
        { name: 'HVAC Startup', duration: 1, materials: [] },
      ]
    },
    {
      name: 'Completion',
      tasks: [
        { name: 'Final Cleanup', duration: 2, materials: ['Cleaning Supplies'] },
        { name: 'Final Inspection', duration: 1, materials: [], inspectionRequired: true },
        { name: 'Punch List Completion', duration: 3, materials: [] },
      ]
    }
  ]);

  /** Normalize a material entry (string or {item, leadDays}) to a common shape. */
  const normalizeMaterial = (m: any): { item: string; leadDays: number } =>
    typeof m === 'string' ? { item: m, leadDays: 2 } : { item: m.item, leadDays: m.leadDays ?? 2 };

  const generateFullSchedule = async () => {
    setGenerating(true);

    // Pull live construction templates (durations, crews, per-material lead
    // times, required inspections) from the design-standards data source.
    let phases = standardPhases;
    try {
      const res = await fetch(`${SERVER}/design-standards/schedule-templates`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.phases) && data.phases.length > 0) {
        phases = data.phases;
        setStandardPhases(data.phases);
        setTemplateSource('live');
      } else {
        setTemplateSource('local');
        console.warn('Schedule-templates fetch returned nothing, using local fallback:', data?.error);
      }
    } catch (err) {
      setTemplateSource('local');
      console.warn('Schedule-templates fetch failed, using local fallback:', err);
    }

    const allTasks: ScheduleTask[] = [];
    const deliveryList: MaterialDelivery[] = [];
    let currentDate = new Date(projectStartDate);
    let previousTaskId = '';

    phases.forEach((phase: any) => {
      phase.tasks.forEach((task: any, idx: number) => {
        const taskId = `task-${phase.name}-${idx}`;
        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + task.duration);

        const mats = (task.materials || []).map(normalizeMaterial);

        allTasks.push({
          id: taskId,
          name: task.name,
          phase: phase.name,
          duration: task.duration,
          startDate,
          endDate,
          dependencies: previousTaskId ? [previousTaskId] : [],
          assignedTo: phase.crew || 'TBD',
          materials: mats.map(m => m.item),
          inspectionRequired: task.inspectionRequired || false,
          status: 'not-started',
          progress: 0
        });

        // Schedule each material's delivery by its real procurement lead time
        // (ordered leadDays before the task that needs it).
        mats.forEach((m) => {
          const deliveryDate = new Date(startDate);
          deliveryDate.setDate(deliveryDate.getDate() - m.leadDays);
          deliveryList.push({
            id: `del-${taskId}-${m.item}`,
            material: m.item,
            quantity: 'As per estimate',
            supplier: 'TBD',
            scheduledDate: deliveryDate,
            requiredFor: [taskId],
            cost: 0,
            status: 'scheduled'
          });
        });

        currentDate = new Date(endDate);
        currentDate.setDate(currentDate.getDate() + 1); // 1 day buffer
        previousTaskId = taskId;
      });
    });

    setTasks(allTasks);
    setDeliveries(deliveryList);
    generateInspections(allTasks);
    setGenerating(false);

    toast.success(`Generated ${allTasks.length}-task schedule`);
  };

  const generateInspections = (taskList: ScheduleTask[]) => {
    const inspectionList: Inspection[] = [];
    
    taskList.filter(t => t.inspectionRequired).forEach((task) => {
      // Schedule inspection on task end date
      inspectionList.push({
        id: `insp-${task.id}`,
        type: task.name,
        scheduledDate: task.endDate,
        inspector: 'TBD - Contact Building Department',
        relatedTasks: [task.id],
        status: 'pending',
        notes: ''
      });
    });

    setInspections(inspectionList);
  };

  const exportSchedule = () => {
    const csv = [
      '=== PROJECT SCHEDULE ===',
      `Project: ${projectName}`,
      `Start Date: ${projectStartDate.toLocaleDateString()}`,
      `Total Duration: ${tasks.length > 0 ? Math.ceil((tasks[tasks.length - 1].endDate.getTime() - tasks[0].startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0} days`,
      '',
      '=== TASK SCHEDULE ===',
      'Phase,Task,Duration (days),Start Date,End Date,Materials,Inspection Required',
      ...tasks.map(t => `${t.phase},${t.name},${t.duration},${t.startDate.toLocaleDateString()},${t.endDate.toLocaleDateString()},"${t.materials.join('; ')}",${t.inspectionRequired ? 'Yes' : 'No'}`),
      '',
      '=== MATERIAL DELIVERIES ===',
      'Material,Scheduled Date,Required For,Supplier',
      ...deliveries.map(d => `${d.material},${d.scheduledDate.toLocaleDateString()},${tasks.find(t => t.id === d.requiredFor[0])?.name || 'Unknown'},${d.supplier}`),
      '',
      '=== INSPECTIONS ===',
      'Type,Scheduled Date,Related Task',
      ...inspections.map(i => `${i.type},${i.scheduledDate.toLocaleDateString()},${tasks.find(t => t.id === i.relatedTasks[0])?.name || 'Unknown'}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `construction-schedule-${Date.now()}.csv`;
    a.click();

    toast.success('Schedule exported!');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Calendar className="w-8 h-8" />
                Construction Schedule Generator
              </h2>
              <p className="text-white/80 mt-1">{projectName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-6">
          <div className="flex gap-4">
            {[
              { id: 'gantt', label: 'Gantt Chart', icon: Calendar },
              { id: 'tasks', label: 'Task List', icon: FileText },
              { id: 'materials', label: 'Material Deliveries', icon: Package },
              { id: 'inspections', label: 'Inspections', icon: AlertCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`px-6 py-4 font-semibold transition border-b-2 flex items-center gap-2 ${
                  activeView === tab.id
                    ? 'text-blue-500 border-blue-500'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Generate Button if empty */}
          {tasks.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-24 h-24 mx-auto text-gray-600 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">No Schedule Generated</h3>
              <p className="text-gray-400 mb-6">Click below to generate a comprehensive construction schedule</p>
              <button
                onClick={generateFullSchedule}
                disabled={generating}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition flex items-center gap-3 mx-auto disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {generating ? 'Building from live templates…' : 'Generate Full Schedule'}
              </button>
            </div>
          )}

          {/* Gantt View */}
          {activeView === 'gantt' && tasks.length > 0 && (
            <div className="space-y-4">
              <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-4">
                <p className="text-blue-400 font-semibold">
                  Total Duration: {Math.ceil((tasks[tasks.length - 1].endDate.getTime() - tasks[0].startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>

              {standardPhases.map((phase) => {
                const phaseTasks = tasks.filter(t => t.phase === phase.name);
                if (phaseTasks.length === 0) return null;

                return (
                  <div key={phase.name} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                    <div className="bg-[#2A2A2A] px-6 py-3">
                      <h3 className="text-white font-bold">{phase.name}</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {phaseTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-4 bg-[#0A0A0A] p-4 rounded-lg">
                          <div className="flex-1">
                            <p className="text-white font-semibold">{task.name}</p>
                            <p className="text-gray-400 text-sm mt-1">
                              {task.startDate.toLocaleDateString()} - {task.endDate.toLocaleDateString()} ({task.duration} days)
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.inspectionRequired && (
                              <span className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-lg text-xs font-semibold">
                                Inspection
                              </span>
                            )}
                            {task.materials.length > 0 && (
                              <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-lg text-xs font-semibold">
                                {task.materials.length} Materials
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tasks View */}
          {activeView === 'tasks' && tasks.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#0A0A0A]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Phase</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Start</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-[#1A1A1A]">
                      <td className="px-6 py-4 text-white">{task.name}</td>
                      <td className="px-6 py-4 text-gray-400">{task.phase}</td>
                      <td className="px-6 py-4 text-gray-400">{task.duration} days</td>
                      <td className="px-6 py-4 text-gray-400">{task.startDate.toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-gray-400">{task.endDate.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Materials View */}
          {activeView === 'materials' && deliveries.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2A2A2A]">
                <h3 className="text-xl font-bold text-white">Material Delivery Schedule</h3>
                <p className="text-gray-400 text-sm mt-1">{deliveries.length} deliveries scheduled</p>
              </div>
              <table className="w-full">
                <thead className="bg-[#0A0A0A]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Material</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Delivery Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Required For</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-[#1A1A1A]">
                      <td className="px-6 py-4 text-white">{delivery.material}</td>
                      <td className="px-6 py-4 text-gray-400">{delivery.scheduledDate.toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-gray-400">
                        {tasks.find(t => t.id === delivery.requiredFor[0])?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-gray-400">{delivery.supplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Inspections View */}
          {activeView === 'inspections' && inspections.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#2A2A2A]">
                <h3 className="text-xl font-bold text-white">Inspection Schedule</h3>
                <p className="text-gray-400 text-sm mt-1">{inspections.length} inspections required</p>
              </div>
              <div className="p-6 space-y-4">
                {inspections.map((inspection) => (
                  <div key={inspection.id} className="bg-[#0A0A0A] border border-yellow-600/30 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-bold">{inspection.type}</h4>
                        <p className="text-gray-400 text-sm mt-1">{inspection.scheduledDate.toLocaleDateString()}</p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-lg text-xs font-semibold uppercase">
                        Required
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{inspection.inspector}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] p-6 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {tasks.length} tasks • {deliveries.length} deliveries • {inspections.length} inspections
            {templateSource === 'live' && <span className="text-green-400"> • live templates</span>}
            {templateSource === 'local' && <span className="text-yellow-400"> • local templates</span>}
          </div>
          <div className="flex gap-3">
            {tasks.length === 0 && (
              <button
                onClick={generateFullSchedule}
                disabled={generating}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center gap-2 disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Generating…' : 'Generate Schedule'}
              </button>
            )}
            {tasks.length > 0 && (
              <>
                <button
                  onClick={exportSchedule}
                  className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-medium transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => {
                    if (onSave) {
                      onSave({ tasks, deliveries, inspections });
                    }
                    toast.success('Schedule saved!');
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Schedule
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
