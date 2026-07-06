import { useState } from 'react';
import {
  Calendar, Clock, Users, Wrench, CheckCircle, AlertCircle,
  Plus, Trash2, Edit2, Save, X, Zap, ChevronDown, ChevronUp,
  MapPin, DollarSign, Target, Briefcase
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from './ui/button/PrimaryButton';
import { SecondaryButton } from './ui/button/SecondaryButton';

interface JobPhase {
  id: string;
  name: string;
  description: string;
  duration: number; // in days
  requiredSkills: string[];
  estimatedCost: number;
  dependencies: string[]; // IDs of phases that must complete first
  tasks: JobTask[];
}

interface JobTask {
  id: string;
  name: string;
  duration: number; // in hours
  assignedEmployees: string[];
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed';
}

interface GeneratedSchedule {
  id: string;
  workOrderId: string;
  projectTitle: string;
  totalDuration: number; // in days
  estimatedStartDate: string;
  estimatedEndDate: string;
  totalCost: number;
  phases: JobPhase[];
  milestones: Array<{
    name: string;
    date: string;
    description: string;
  }>;
}

interface AutoJobScheduleGeneratorProps {
  workOrder: {
    id: string;
    title: string;
    serviceType: string;
    description: string;
    estimatedValue: number;
    location?: string;
  };
  onScheduleGenerated: (schedule: GeneratedSchedule) => void;
  onCancel: () => void;
}

// Template library for different project types
const PROJECT_TEMPLATES: Record<string, JobPhase[]> = {
  'Kitchen Remodel': [
    {
      id: 'demo',
      name: 'Demolition & Prep',
      description: 'Remove existing cabinets, countertops, and appliances',
      duration: 2,
      requiredSkills: ['Demolition', 'General Labor'],
      estimatedCost: 2500,
      dependencies: [],
      tasks: [
        { id: 'demo-1', name: 'Remove cabinets', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'demo-2', name: 'Remove countertops', duration: 3, assignedEmployees: [], status: 'pending' },
        { id: 'demo-3', name: 'Disconnect appliances', duration: 2, assignedEmployees: [], status: 'pending' },
        { id: 'demo-4', name: 'Debris removal', duration: 3, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'rough',
      name: 'Rough-In Work',
      description: 'Electrical, plumbing, and HVAC rough-in',
      duration: 3,
      requiredSkills: ['Electrician', 'Plumber', 'HVAC'],
      estimatedCost: 5000,
      dependencies: ['demo'],
      tasks: [
        { id: 'rough-1', name: 'Electrical rough-in', duration: 8, assignedEmployees: [], status: 'pending' },
        { id: 'rough-2', name: 'Plumbing rough-in', duration: 8, assignedEmployees: [], status: 'pending' },
        { id: 'rough-3', name: 'HVAC adjustments', duration: 6, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'drywall',
      name: 'Drywall & Paint',
      description: 'Patch drywall, paint walls and ceiling',
      duration: 3,
      requiredSkills: ['Drywall', 'Painter'],
      estimatedCost: 3000,
      dependencies: ['rough'],
      tasks: [
        { id: 'drywall-1', name: 'Patch and tape drywall', duration: 6, assignedEmployees: [], status: 'pending' },
        { id: 'drywall-2', name: 'Prime walls', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'drywall-3', name: 'Paint walls and ceiling', duration: 6, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'install',
      name: 'Cabinet & Countertop Installation',
      description: 'Install new cabinets and countertops',
      duration: 4,
      requiredSkills: ['Carpenter', 'General Contractor'],
      estimatedCost: 8000,
      dependencies: ['drywall'],
      tasks: [
        { id: 'install-1', name: 'Install base cabinets', duration: 8, assignedEmployees: [], status: 'pending' },
        { id: 'install-2', name: 'Install wall cabinets', duration: 6, assignedEmployees: [], status: 'pending' },
        { id: 'install-3', name: 'Install countertops', duration: 6, assignedEmployees: [], status: 'pending' },
        { id: 'install-4', name: 'Install backsplash', duration: 4, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'finish',
      name: 'Finish Work & Cleanup',
      description: 'Install appliances, fixtures, and final touches',
      duration: 2,
      requiredSkills: ['Electrician', 'Plumber', 'General Labor'],
      estimatedCost: 2500,
      dependencies: ['install'],
      tasks: [
        { id: 'finish-1', name: 'Install appliances', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'finish-2', name: 'Install fixtures and hardware', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'finish-3', name: 'Final cleanup', duration: 3, assignedEmployees: [], status: 'pending' },
        { id: 'finish-4', name: 'Final walkthrough', duration: 1, assignedEmployees: [], status: 'pending' }
      ]
    }
  ],
  'Bathroom Remodel': [
    {
      id: 'demo',
      name: 'Demolition',
      description: 'Remove existing fixtures and finishes',
      duration: 1,
      requiredSkills: ['Demolition', 'General Labor'],
      estimatedCost: 1500,
      dependencies: [],
      tasks: [
        { id: 'demo-1', name: 'Remove fixtures', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'demo-2', name: 'Remove tile and flooring', duration: 4, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'rough',
      name: 'Rough-In',
      description: 'Plumbing and electrical rough-in',
      duration: 2,
      requiredSkills: ['Plumber', 'Electrician'],
      estimatedCost: 3500,
      dependencies: ['demo'],
      tasks: [
        { id: 'rough-1', name: 'Plumbing rough-in', duration: 8, assignedEmployees: [], status: 'pending' },
        { id: 'rough-2', name: 'Electrical rough-in', duration: 6, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'tile',
      name: 'Tile & Flooring',
      description: 'Install tile walls and floor',
      duration: 3,
      requiredSkills: ['Tile Setter'],
      estimatedCost: 4000,
      dependencies: ['rough'],
      tasks: [
        { id: 'tile-1', name: 'Waterproofing', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'tile-2', name: 'Install wall tile', duration: 10, assignedEmployees: [], status: 'pending' },
        { id: 'tile-3', name: 'Install floor tile', duration: 6, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'finish',
      name: 'Fixtures & Finish',
      description: 'Install fixtures and final touches',
      duration: 2,
      requiredSkills: ['Plumber', 'Electrician', 'Painter'],
      estimatedCost: 3000,
      dependencies: ['tile'],
      tasks: [
        { id: 'finish-1', name: 'Install vanity', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'finish-2', name: 'Install toilet and fixtures', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'finish-3', name: 'Paint and caulk', duration: 4, assignedEmployees: [], status: 'pending' }
      ]
    }
  ],
  'Flooring Installation': [
    {
      id: 'prep',
      name: 'Surface Preparation',
      description: 'Remove old flooring and prep subfloor',
      duration: 1,
      requiredSkills: ['General Labor', 'Flooring Specialist'],
      estimatedCost: 1000,
      dependencies: [],
      tasks: [
        { id: 'prep-1', name: 'Remove old flooring', duration: 6, assignedEmployees: [], status: 'pending' },
        { id: 'prep-2', name: 'Level and clean subfloor', duration: 4, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'install',
      name: 'Flooring Installation',
      description: 'Install new flooring',
      duration: 3,
      requiredSkills: ['Flooring Specialist'],
      estimatedCost: 5000,
      dependencies: ['prep'],
      tasks: [
        { id: 'install-1', name: 'Install underlayment', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'install-2', name: 'Install flooring', duration: 16, assignedEmployees: [], status: 'pending' },
        { id: 'install-3', name: 'Install transitions and trim', duration: 4, assignedEmployees: [], status: 'pending' }
      ]
    }
  ],
  'Painting': [
    {
      id: 'prep',
      name: 'Surface Prep',
      description: 'Prep walls and surfaces for painting',
      duration: 1,
      requiredSkills: ['Painter'],
      estimatedCost: 800,
      dependencies: [],
      tasks: [
        { id: 'prep-1', name: 'Patch holes and imperfections', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'prep-2', name: 'Sand and clean surfaces', duration: 3, assignedEmployees: [], status: 'pending' },
        { id: 'prep-3', name: 'Tape and protect', duration: 2, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'paint',
      name: 'Painting',
      description: 'Prime and paint surfaces',
      duration: 2,
      requiredSkills: ['Painter'],
      estimatedCost: 2000,
      dependencies: ['prep'],
      tasks: [
        { id: 'paint-1', name: 'Apply primer', duration: 4, assignedEmployees: [], status: 'pending' },
        { id: 'paint-2', name: 'First coat', duration: 6, assignedEmployees: [], status: 'pending' },
        { id: 'paint-3', name: 'Second coat', duration: 6, assignedEmployees: [], status: 'pending' }
      ]
    }
  ],
  'General': [
    {
      id: 'assessment',
      name: 'Site Assessment',
      description: 'Initial site visit and scope assessment',
      duration: 1,
      requiredSkills: ['Project Manager'],
      estimatedCost: 500,
      dependencies: [],
      tasks: [
        { id: 'assess-1', name: 'Site inspection', duration: 2, assignedEmployees: [], status: 'pending' },
        { id: 'assess-2', name: 'Scope documentation', duration: 2, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'execution',
      name: 'Project Execution',
      description: 'Main work execution phase',
      duration: 5,
      requiredSkills: ['General Contractor', 'General Labor'],
      estimatedCost: 5000,
      dependencies: ['assessment'],
      tasks: [
        { id: 'exec-1', name: 'Primary work', duration: 32, assignedEmployees: [], status: 'pending' },
        { id: 'exec-2', name: 'Quality checks', duration: 4, assignedEmployees: [], status: 'pending' }
      ]
    },
    {
      id: 'completion',
      name: 'Final Completion',
      description: 'Final touches and walkthrough',
      duration: 1,
      requiredSkills: ['Project Manager'],
      estimatedCost: 500,
      dependencies: ['execution'],
      tasks: [
        { id: 'complete-1', name: 'Final cleanup', duration: 3, assignedEmployees: [], status: 'pending' },
        { id: 'complete-2', name: 'Client walkthrough', duration: 1, assignedEmployees: [], status: 'pending' }
      ]
    }
  ]
};

export default function AutoJobScheduleGenerator({
  workOrder,
  onScheduleGenerated,
  onCancel
}: AutoJobScheduleGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('General');
  const [phases, setPhases] = useState<JobPhase[]>([]);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Auto-select template based on service type
  useState(() => {
    const serviceType = workOrder.serviceType;
    const matchedTemplate = Object.keys(PROJECT_TEMPLATES).find(key =>
      serviceType.toLowerCase().includes(key.toLowerCase())
    );
    if (matchedTemplate) {
      setSelectedTemplate(matchedTemplate);
      setPhases(JSON.parse(JSON.stringify(PROJECT_TEMPLATES[matchedTemplate])));
    } else {
      setPhases(JSON.parse(JSON.stringify(PROJECT_TEMPLATES['General'])));
    }
  });

  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
    setPhases(JSON.parse(JSON.stringify(PROJECT_TEMPLATES[template])));
  };

  const calculateEndDate = (start: string, totalDays: number): string => {
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + totalDays * 86400000);
    return endDate.toISOString().split('T')[0];
  };

  const calculateMilestones = (phases: JobPhase[], startDate: string) => {
    const milestones = [];
    let currentDate = new Date(startDate);

    phases.forEach((phase, index) => {
      // Add dependencies check
      const canStart = phase.dependencies.every(depId =>
        phases.find(p => p.id === depId)
      );

      if (canStart) {
        // Calculate start date based on dependencies
        let phaseStartDate = new Date(startDate);
        phase.dependencies.forEach(depId => {
          const depPhase = phases.find(p => p.id === depId);
          if (depPhase) {
            const depIndex = phases.indexOf(depPhase);
            let depEndDate = new Date(startDate);
            for (let i = 0; i <= depIndex; i++) {
              depEndDate = new Date(depEndDate.getTime() + phases[i].duration * 86400000);
            }
            if (depEndDate > phaseStartDate) {
              phaseStartDate = depEndDate;
            }
          }
        });

        milestones.push({
          name: `${phase.name} - Start`,
          date: phaseStartDate.toISOString().split('T')[0],
          description: `Begin ${phase.name.toLowerCase()}`
        });

        const phaseEndDate = new Date(phaseStartDate.getTime() + phase.duration * 86400000);
        milestones.push({
          name: `${phase.name} - Complete`,
          date: phaseEndDate.toISOString().split('T')[0],
          description: `Complete ${phase.name.toLowerCase()}`
        });
      }
    });

    return milestones;
  };

  const handleGenerate = () => {
    setIsGenerating(true);

    const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
    const totalCost = phases.reduce((sum, phase) => sum + phase.estimatedCost, 0);
    const endDate = calculateEndDate(startDate, totalDuration);
    const milestones = calculateMilestones(phases, startDate);

    const schedule: GeneratedSchedule = {
      id: `schedule-${Date.now()}`,
      workOrderId: workOrder.id,
      projectTitle: workOrder.title,
      totalDuration,
      estimatedStartDate: startDate,
      estimatedEndDate: endDate,
      totalCost,
      phases,
      milestones
    };

    // Save to localStorage
    const existingSchedules = JSON.parse(localStorage.getItem('jobSchedules') || '[]');
    existingSchedules.push(schedule);
    localStorage.setItem('jobSchedules', JSON.stringify(existingSchedules));

    setTimeout(() => {
      setIsGenerating(false);
      toast.success('Job schedule generated successfully!');
      onScheduleGenerated(schedule);
    }, 1000);
  };

  const updatePhase = (phaseId: string, field: string, value: any) => {
    setPhases(phases.map(p =>
      p.id === phaseId ? { ...p, [field]: value } : p
    ));
  };

  const addPhase = () => {
    const newPhase: JobPhase = {
      id: `phase-${Date.now()}`,
      name: 'New Phase',
      description: '',
      duration: 1,
      requiredSkills: [],
      estimatedCost: 0,
      dependencies: [],
      tasks: []
    };
    setPhases([...phases, newPhase]);
  };

  const removePhase = (phaseId: string) => {
    setPhases(phases.filter(p => p.id !== phaseId));
  };

  const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
  const totalCost = phases.reduce((sum, phase) => sum + phase.estimatedCost, 0);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-6 h-6 text-orange-400" />
              Auto-Generate Job Schedule
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {workOrder.title} - {workOrder.serviceType}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Template Selection */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Select Project Template</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.keys(PROJECT_TEMPLATES).map(template => (
                <button
                  key={template}
                  onClick={() => handleTemplateChange(template)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedTemplate === template
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className={`w-5 h-5 ${
                      selectedTemplate === template ? 'text-orange-400' : 'text-gray-400'
                    }`} />
                    <span className={`font-semibold ${
                      selectedTemplate === template ? 'text-orange-400' : 'text-white'
                    }`}>
                      {template}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {PROJECT_TEMPLATES[template].length} phases
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
            <label className="block text-sm font-semibold text-white mb-3">
              Project Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
              <Calendar className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-sm text-gray-400 mb-1">Total Duration</p>
              <p className="text-2xl font-bold text-white">{totalDuration} days</p>
            </div>
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
              <DollarSign className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-sm text-gray-400 mb-1">Estimated Cost</p>
              <p className="text-2xl font-bold text-white">${totalCost.toLocaleString()}</p>
            </div>
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
              <Target className="w-6 h-6 text-orange-400 mb-2" />
              <p className="text-sm text-gray-400 mb-1">Completion Date</p>
              <p className="text-lg font-bold text-white">
                {calculateEndDate(startDate, totalDuration)}
              </p>
            </div>
          </div>

          {/* Phases */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Project Phases</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    isEditing
                      ? 'bg-orange-500 text-white'
                      : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                  }`}
                >
                  <Edit2 className="w-4 h-4 inline mr-1" />
                  {isEditing ? 'Editing' : 'Edit'}
                </button>
                {isEditing && (
                  <PrimaryButton onClick={addPhase} className="flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    Add Phase
                  </PrimaryButton>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-bold text-orange-400">
                            Phase {index + 1}
                          </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={phase.name}
                              onChange={(e) => updatePhase(phase.id, 'name', e.target.value)}
                              className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-1 text-white text-sm font-bold focus:outline-none focus:border-orange-500/50"
                            />
                          ) : (
                            <h4 className="text-white font-bold">{phase.name}</h4>
                          )}
                        </div>

                        {isEditing ? (
                          <textarea
                            value={phase.description}
                            onChange={(e) => updatePhase(phase.id, 'description', e.target.value)}
                            rows={2}
                            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/50 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-400">{phase.description}</p>
                        )}

                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Duration (days)</label>
                            {isEditing ? (
                              <input
                                type="number"
                                value={phase.duration || ''}
                                onChange={(e) => updatePhase(phase.id, 'duration', parseInt(e.target.value) || 0)}
                                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                              />
                            ) : (
                              <p className="text-white font-semibold">{phase.duration} days</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Estimated Cost</label>
                            {isEditing ? (
                              <input
                                type="number"
                                value={phase.estimatedCost || ''}
                                onChange={(e) => updatePhase(phase.id, 'estimatedCost', parseInt(e.target.value) || 0)}
                                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500/50"
                              />
                            ) : (
                              <p className="text-green-400 font-semibold">${phase.estimatedCost.toLocaleString()}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Tasks</label>
                            <p className="text-white font-semibold">{phase.tasks.length} tasks</p>
                          </div>
                        </div>

                        {phase.requiredSkills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {phase.requiredSkills.map((skill, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {isEditing && (
                          <button
                            onClick={() => removePhase(phase.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition"
                        >
                          {expandedPhase === phase.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Tasks */}
                  {expandedPhase === phase.id && (
                    <div className="border-t border-[#2A2A2A] p-4 bg-[#0A0A0A]">
                      <h5 className="text-sm font-bold text-white mb-3">Tasks</h5>
                      <div className="space-y-2">
                        {phase.tasks.map((task, taskIndex) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-4 h-4 text-gray-600" />
                              <span className="text-white text-sm">{task.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-400">{task.duration}hrs</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                                task.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#2A2A2A] px-6 py-4 flex items-center justify-between bg-[#0A0A0A]">
          <div className="text-sm text-gray-400">
            {phases.length} phases • {totalDuration} days • ${totalCost.toLocaleString()}
          </div>
          <div className="flex items-center gap-3">
            <SecondaryButton onClick={onCancel}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Schedule
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
