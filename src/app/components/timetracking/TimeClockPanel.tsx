import { useState, useEffect } from 'react';
import { Play, Square, Pause, Timer, MapPin } from 'lucide-react';

interface TimeEntry {
  id: string;
  clockIn: string;
  clockOut?: string;
  breakStart?: string;
  breakEnd?: string;
  location?: string;
}

interface TimeClockPanelProps {
  activeEntry: TimeEntry | null;
  onClockIn: () => void;
  onClockOut: () => void;
  onBreakToggle: () => void;
  isOnBreak: boolean;
}

export function TimeClockPanel({ 
  activeEntry, 
  onClockIn, 
  onClockOut, 
  onBreakToggle, 
  isOnBreak 
}: TimeClockPanelProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateActiveTime = () => {
    if (!activeEntry) return '0:00:00';
    const startTime = new Date(activeEntry.clockIn);
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6">Quick Clock</h2>
        {activeEntry ? (
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Clocked in at</span>
                <span className="text-[#ea580c] font-semibold">{formatDate(activeEntry.clockIn)}</span>
              </div>
              <div className="text-center py-6">
                <div className="text-6xl font-bold text-[#ea580c] mb-2">{calculateActiveTime()}</div>
                <div className="text-gray-400">Active Time</div>
              </div>
              {activeEntry.location && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mt-4">
                  <MapPin className="w-4 h-4" />
                  {activeEntry.location}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onBreakToggle}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold transition-all ${
                  isOnBreak
                    ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                    : 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800'
                }`}
              >
                {isOnBreak ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                {isOnBreak ? 'End Break' : 'Start Break'}
              </button>
              <button
                onClick={onClockOut}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg font-semibold transition-all"
              >
                <Square className="w-5 h-5" />
                Clock Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6 text-center">
              <Timer className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Not currently clocked in</p>
            </div>
            <button
              onClick={onClockIn}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:from-[#dc2626] hover:to-[#ea580c] rounded-lg font-semibold transition-all text-lg"
            >
              <Play className="w-6 h-6" />
              Clock In
            </button>
          </div>
        )}
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Today's Summary</h2>
        <div className="space-y-4">
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Hours</span>
              <span className="text-2xl font-bold text-[#ea580c]">0.00</span>
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Regular Hours</span>
              <span className="text-2xl font-bold text-green-500">0.00</span>
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Overtime Hours</span>
              <span className="text-2xl font-bold text-yellow-500">0.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
