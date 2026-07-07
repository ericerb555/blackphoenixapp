import React, { useState, useMemo } from 'react';
import { Calendar, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface StructuralElement {
  id: string;
  type: 'beam' | 'column' | 'foundation' | 'slab';
  properties: any;
}

interface ScheduleTimelinePanelProps {
  elements: StructuralElement[];
}

interface Phase {
  id: string;
  name: string;
  duration: number; // days
  dependencies: string[];
  color: string;
}

export function ScheduleTimelinePanel({ elements }: ScheduleTimelinePanelProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const phases: Phase[] = useMemo(() => {
    const beamCount = elements.filter(e => e.type === 'beam').length;
    const columnCount = elements.filter(e => e.type === 'column').length;
    const foundationCount = elements.filter(e => e.type === 'foundation').length;
    const slabCount = elements.filter(e => e.type === 'slab').length;

    return [
      {
        id: 'phase-1',
        name: 'Site Preparation',
        duration: 5,
        dependencies: [],
        color: '#f59e0b',
      },
      {
        id: 'phase-2',
        name: 'Foundation Work',
        duration: Math.max(7, foundationCount * 2),
        dependencies: ['phase-1'],
        color: '#f59e0b',
      },
      {
        id: 'phase-3',
        name: 'Column Installation',
        duration: Math.max(5, columnCount * 1),
        dependencies: ['phase-2'],
        color: '#10b981',
      },
      {
        id: 'phase-4',
        name: 'Beam Installation',
        duration: Math.max(6, beamCount * 1),
        dependencies: ['phase-3'],
        color: '#3b82f6',
      },
      {
        id: 'phase-5',
        name: 'Slab Pouring',
        duration: Math.max(4, slabCount * 2),
        dependencies: ['phase-4'],
        color: '#8b5cf6',
      },
      {
        id: 'phase-6',
        name: 'Curing & Finishing',
        duration: 14,
        dependencies: ['phase-5'],
        color: '#6366f1',
      },
      {
        id: 'phase-7',
        name: 'Inspection & Testing',
        duration: 3,
        dependencies: ['phase-6'],
        color: '#ec4899',
      },
    ];
  }, [elements]);

  const timeline = useMemo(() => {
    const start = new Date(startDate);
    const schedule: Array<{ phase: Phase; startDate: Date; endDate: Date }> = [];
    const phaseEndDates: Record<string, Date> = {};

    phases.forEach(phase => {
      let phaseStart = new Date(start);

      // Calculate start based on dependencies
      if (phase.dependencies.length > 0) {
        const depEndDates = phase.dependencies.map(depId => phaseEndDates[depId]);
        phaseStart = new Date(Math.max(...depEndDates.map(d => d.getTime())));
      }

      const phaseEnd = new Date(phaseStart);
      phaseEnd.setDate(phaseEnd.getDate() + phase.duration);

      phaseEndDates[phase.id] = phaseEnd;
      schedule.push({ phase, startDate: phaseStart, endDate: phaseEnd });
    });

    return schedule;
  }, [phases, startDate]);

  const totalDuration = timeline.length > 0
    ? Math.ceil((timeline[timeline.length - 1].endDate.getTime() - timeline[0].startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const projectEndDate = timeline.length > 0
    ? timeline[timeline.length - 1].endDate.toLocaleDateString()
    : 'N/A';

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-pink-500" />
        Schedule & Timeline
      </h3>

      {/* Project Timeline Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-[#2A2A2A] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Total Duration</div>
          <div className="text-lg font-bold text-pink-400">{totalDuration} days</div>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Completion</div>
          <div className="text-lg font-bold text-blue-400">{projectEndDate}</div>
        </div>
      </div>

      {/* Start Date Selector */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 block mb-2">Project Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-sm focus:outline-none focus:border-pink-500"
        />
      </div>

      {/* Phase Timeline */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-semibold text-gray-400 mb-2">Construction Phases</div>
        {timeline.map(({ phase, startDate, endDate }, index) => (
          <div key={phase.id} className="bg-[#2A2A2A] rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }}></div>
                <div>
                  <div className="text-xs font-semibold">{phase.name}</div>
                  <div className="text-xs text-gray-400">Phase {index + 1}</div>
                </div>
              </div>
              <div className="text-xs text-gray-400">{phase.duration}d</div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
            </div>
            {phase.dependencies.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Depends on: {phase.dependencies.map(d => phases.find(p => p.id === d)?.name).join(', ')}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Timeline Visualization */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-400 mb-2">Timeline Overview</div>
        <div className="bg-[#2A2A2A] rounded-lg p-3">
          <div className="space-y-1">
            {timeline.map(({ phase, startDate, endDate }) => {
              const totalDays = totalDuration;
              const phaseStart = Math.floor((startDate.getTime() - timeline[0].startDate.getTime()) / (1000 * 60 * 60 * 24));
              const width = (phase.duration / totalDays) * 100;
              const left = (phaseStart / totalDays) * 100;

              return (
                <div key={phase.id} className="relative h-6">
                  <div
                    className="absolute h-4 rounded"
                    style={{
                      backgroundColor: phase.color,
                      left: `${left}%`,
                      width: `${width}%`,
                      opacity: 0.8,
                    }}
                  >
                    <div className="text-xs text-white px-1 truncate leading-4">{phase.name.split(' ')[0]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical Path */}
      <div className="bg-pink-600/20 border border-pink-600/30 rounded-lg p-3">
        <div className="text-xs font-semibold text-pink-400 mb-2 flex items-center gap-2">
          <TrendingUp className="w-3 h-3" />
          Critical Path Analysis
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Phases:</span>
            <span>{phases.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Avg Phase Duration:</span>
            <span>{Math.round(totalDuration / phases.length)} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Longest Phase:</span>
            <span>{Math.max(...phases.map(p => p.duration))} days</span>
          </div>
        </div>
      </div>

      {elements.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm mt-4">
          Add elements to generate schedule
        </div>
      )}
    </div>
  );
}
