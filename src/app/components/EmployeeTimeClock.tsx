import { useState, useEffect } from 'react';
import { 
  Clock, Play, Square, Pause, MapPin, Camera, 
  Briefcase, Calendar, TrendingUp, ChevronRight,
  CheckCircle, AlertCircle 
} from 'lucide-react';

interface TimeClockEntry {
  id: string;
  clockIn: Date;
  clockOut?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  location?: string;
  photo?: string;
  projectId?: string;
  projectName?: string;
}

interface EmployeeTimeClockProps {
  employeeId: string;
  employeeName: string;
}

export function EmployeeTimeClock({ employeeId, employeeName }: EmployeeTimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeEntry, setActiveEntry] = useState<TimeClockEntry | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [location, setLocation] = useState<string>('');
  const [todayHours, setTodayHours] = useState(0);
  const [weekHours, setWeekHours] = useState(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get GPS location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        },
        (error) => {
          console.error('Location error:', error);
          setLocation('Location unavailable');
        }
      );
    }
  }, []);

  const handleClockIn = async () => {
    // Take photo if camera available
    let photo: string | undefined;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // In production, you'd capture the photo here
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.log('Camera not available');
    }

    const newEntry: TimeClockEntry = {
      id: Date.now().toString(),
      clockIn: new Date(),
      location,
      photo
    };

    setActiveEntry(newEntry);
  };

  const handleClockOut = () => {
    if (!activeEntry) return;

    const updatedEntry = {
      ...activeEntry,
      clockOut: new Date()
    };

    // Calculate hours
    const hours = (updatedEntry.clockOut.getTime() - updatedEntry.clockIn.getTime()) / (1000 * 60 * 60);
    setTodayHours(prev => prev + hours);

    setActiveEntry(null);
    setIsOnBreak(false);
  };

  const handleBreakToggle = () => {
    if (!activeEntry) return;

    if (!isOnBreak) {
      setActiveEntry({
        ...activeEntry,
        breakStart: new Date()
      });
      setIsOnBreak(true);
    } else {
      setActiveEntry({
        ...activeEntry,
        breakEnd: new Date()
      });
      setIsOnBreak(false);
    }
  };

  const getActiveTime = () => {
    if (!activeEntry) return '0:00:00';

    const now = new Date();
    const start = activeEntry.clockIn;
    const diff = now.getTime() - start.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{employeeName}</h1>
            <p className="text-gray-400 text-sm">Time Clock</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#ea580c]">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-gray-400">
              {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Today</div>
          <div className="text-2xl font-bold text-[#ea580c]">
            {todayHours.toFixed(1)}h
          </div>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">This Week</div>
          <div className="text-2xl font-bold text-green-500">
            {weekHours.toFixed(1)}h
          </div>
        </div>
      </div>

      {/* Main Clock Card */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
        {activeEntry ? (
          <div className="space-y-6">
            {/* Active Timer */}
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full animate-pulse" />
              </div>
              <div className="text-5xl font-bold text-[#ea580c] mb-2">
                {getActiveTime()}
              </div>
              <div className="text-gray-400">
                Clocked in at {activeEntry.clockIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Location */}
            {location && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            )}

            {/* Break Status */}
            {isOnBreak && (
              <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-4 text-center">
                <Pause className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <div className="text-yellow-500 font-semibold">On Break</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleBreakToggle}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                  isOnBreak
                    ? 'bg-gradient-to-r from-green-600 to-green-700'
                    : 'bg-gradient-to-r from-yellow-600 to-yellow-700'
                }`}
              >
                {isOnBreak ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                {isOnBreak ? 'Resume' : 'Break'}
              </button>

              <button
                onClick={handleClockOut}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-lg font-semibold transition-all"
              >
                <Square className="w-5 h-5" />
                Clock Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ready to Clock In */}
            <div className="text-center py-8">
              <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <div className="text-gray-400 mb-2">Ready to start your shift?</div>
              <div className="text-sm text-gray-500">
                {currentTime.toLocaleDateString([], { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            {/* Location Preview */}
            {location && (
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#ea580c]" />
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Current Location</div>
                    <div className="text-sm">{location}</div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                </div>
              </div>
            )}

            {/* Clock In Button */}
            <button
              onClick={handleClockIn}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#ea580c] to-[#dc2626] hover:from-[#dc2626] hover:to-[#ea580c] rounded-lg font-semibold text-lg transition-all"
            >
              <Play className="w-6 h-6" />
              Clock In
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { date: 'Today', hours: 7.5, project: 'Kitchen Renovation', status: 'active' },
            { date: 'Yesterday', hours: 8.0, project: 'Bathroom Remodel', status: 'approved' },
            { date: 'Mar 13', hours: 8.5, project: 'Kitchen Renovation', status: 'approved' }
          ].map((entry, index) => (
            <div key={index} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{entry.date}</span>
                <span className="text-[#ea580c] font-bold">{entry.hours}h</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{entry.project}</span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  entry.status === 'active' ? 'bg-green-600' :
                  entry.status === 'approved' ? 'bg-blue-600' : 'bg-yellow-600'
                }`}>
                  {entry.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
