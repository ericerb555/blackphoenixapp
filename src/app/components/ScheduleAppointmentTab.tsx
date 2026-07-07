import { useState } from 'react';
import { 
  Calendar, Clock, Wrench, Zap, Hammer, Eye, MessageSquare, 
  AlertCircle, ChevronRight, Check, X, User, Phone, Mail, 
  FileText, Plus, List, Grid
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from './ui/button/PrimaryButton';

interface ScheduleAppointmentTabProps {
  activeProjects: Array<{
    id: string;
    title: string;
  }>;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

export default function ScheduleAppointmentTab({ activeProjects, customerInfo }: ScheduleAppointmentTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [selectedContractor, setSelectedContractor] = useState<string>('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [preferredContact, setPreferredContact] = useState<'phone' | 'email' | 'text'>('phone');
  const [linkToProject, setLinkToProject] = useState<string>('');
  const [appointmentView, setAppointmentView] = useState<'calendar' | 'list'>('calendar');

  // Service Types for Appointments
  const serviceTypes = [
    { id: 'hvac', name: 'HVAC Service', icon: Wrench },
    { id: 'plumbing', name: 'Plumbing', icon: Wrench },
    { id: 'electrical', name: 'Electrical', icon: Zap },
    { id: 'general', name: 'General Maintenance', icon: Hammer },
    { id: 'inspection', name: 'Inspection', icon: Eye },
    { id: 'consultation', name: 'Consultation', icon: MessageSquare },
    { id: 'emergency', name: 'Emergency Service', icon: AlertCircle }
  ];

  // Available Time Slots
  const availableTimeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];

  // Available Contractors
  const availableContractors = [
    { id: 'contractor-1', name: 'Mike Stevens', specialty: 'HVAC & General' },
    { id: 'contractor-2', name: 'Alex Rivera', specialty: 'Plumbing' },
    { id: 'contractor-3', name: 'David Kim', specialty: 'Construction' },
    { id: 'any', name: 'Any Available', specialty: 'All Services' }
  ];

  // Mock Appointments Data
  const upcomingAppointments = [
    {
      id: 'APT-001',
      serviceType: 'HVAC Maintenance',
      contractor: 'Mike Stevens',
      date: '2024-03-08',
      time: '10:00 AM',
      status: 'confirmed',
      projectId: 'WO-2024-012',
      projectTitle: 'Kitchen Renovation',
      notes: 'Annual HVAC system check'
    },
    {
      id: 'APT-002',
      serviceType: 'Plumbing Inspection',
      contractor: 'Alex Rivera',
      date: '2024-03-12',
      time: '2:00 PM',
      status: 'pending',
      projectId: null,
      projectTitle: null,
      notes: 'Check for potential leaks'
    }
  ];

  const handleBookAppointment = () => {
    if (!selectedDate || !selectedTime || !selectedServiceType) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success(`Appointment booked for ${selectedDate.toLocaleDateString()} at ${selectedTime}`);
    // Reset form
    setSelectedDate(null);
    setSelectedTime('');
    setSelectedServiceType('');
    setSelectedContractor('');
    setAppointmentNotes('');
    setLinkToProject('');
    setAppointmentView('list');
  };

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const days = [];

    // Add padding for first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = monthNames[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Schedule Appointment</h2>
            <p className="text-gray-400">Book a service appointment with our professionals</p>
          </div>
          <div className="flex items-center gap-2 bg-[#0F0F0F] p-1 rounded-lg border border-[#2A2A2A]">
            <button
              onClick={() => setAppointmentView('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                appointmentView === 'calendar'
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4 inline mr-2" />
              Calendar
            </button>
            <button
              onClick={() => setAppointmentView('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                appointmentView === 'list'
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              My Appointments
            </button>
          </div>
        </div>

        {appointmentView === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Calendar & Service Selection */}
            <div className="lg:col-span-2 space-y-6">
              {/* Calendar */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">{currentMonth} {currentYear}</h3>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => {
                    const isToday = day && day.toDateString() === new Date().toDateString();
                    const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString();
                    const isPast = day && day < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <button
                        key={index}
                        disabled={!day || isPast}
                        onClick={() => day && !isPast && setSelectedDate(day)}
                        className={`aspect-square p-2 rounded-lg text-sm font-medium transition ${
                          !day
                            ? 'invisible'
                            : isPast
                            ? 'text-gray-600 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#ea580c] text-white'
                            : isToday
                            ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                            : 'bg-[#0F0F0F] text-gray-300 hover:bg-[#2A2A2A] border border-[#2A2A2A]'
                        }`}
                      >
                        {day ? day.getDate() : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service Type Selection */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Select Service Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  {serviceTypes.map(service => {
                    const Icon = service.icon;
                    const isSelected = selectedServiceType === service.id;
                    return (
                      <button
                        key={service.id}
                        onClick={() => setSelectedServiceType(service.id)}
                        className={`p-4 rounded-xl border transition flex items-center gap-3 ${
                          isSelected
                            ? 'bg-orange-600/20 border-orange-500/50 text-orange-400'
                            : 'bg-[#0F0F0F] border-[#2A2A2A] text-gray-300 hover:border-orange-500/30'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-orange-600/30' : 'bg-[#1A1A1A]'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">{service.name}</span>
                        {isSelected && <Check className="w-5 h-5 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Side - Appointment Details Form */}
            <div className="space-y-6">
              {/* Time Slot Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Select Time</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableTimeSlots.map(time => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        disabled={!selectedDate}
                        className={`p-2 rounded-lg text-sm font-medium transition ${
                          !selectedDate
                            ? 'bg-[#0F0F0F] text-gray-600 cursor-not-allowed border border-[#2A2A2A]'
                            : isSelected
                            ? 'bg-[#ea580c] text-white'
                            : 'bg-[#0F0F0F] text-gray-300 hover:bg-[#2A2A2A] border border-[#2A2A2A]'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contractor Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Preferred Contractor</label>
                <select
                  value={selectedContractor}
                  onChange={(e) => setSelectedContractor(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500/50 focus:outline-none"
                >
                  <option value="">Select Contractor</option>
                  {availableContractors.map(contractor => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} - {contractor.specialty}
                    </option>
                  ))}
                </select>
              </div>

              {/* Link to Existing Project */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Link to Project (Optional)</label>
                <select
                  value={linkToProject}
                  onChange={(e) => setLinkToProject(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500/50 focus:outline-none"
                >
                  <option value="">No Project</option>
                  {activeProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title} ({project.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred Contact Method */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Preferred Contact Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'phone', label: 'Phone', icon: Phone },
                    { value: 'email', label: 'Email', icon: Mail },
                    { value: 'text', label: 'Text', icon: MessageSquare }
                  ].map(method => {
                    const Icon = method.icon;
                    const isSelected = preferredContact === method.value;
                    return (
                      <button
                        key={method.value}
                        onClick={() => setPreferredContact(method.value as any)}
                        className={`p-3 rounded-lg flex flex-col items-center gap-2 transition ${
                          isSelected
                            ? 'bg-orange-600/20 border-2 border-orange-500/50 text-orange-400'
                            : 'bg-[#0F0F0F] border border-[#2A2A2A] text-gray-300 hover:border-orange-500/30'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Notes (Optional)</label>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder="Add any specific details or requests..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none resize-none"
                />
              </div>

              {/* Booking Summary */}
              {selectedDate && selectedTime && selectedServiceType && (
                <div className="p-4 bg-orange-600/10 border border-orange-500/30 rounded-xl">
                  <h4 className="text-sm font-bold text-orange-400 mb-3">Booking Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white font-medium">{selectedDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Time:</span>
                      <span className="text-white font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Service:</span>
                      <span className="text-white font-medium">
                        {serviceTypes.find(s => s.id === selectedServiceType)?.name}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Book Button */}
              <PrimaryButton
                onClick={handleBookAppointment}
                disabled={!selectedDate || !selectedTime || !selectedServiceType}
                className="w-full py-3 text-base font-bold"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book Appointment
              </PrimaryButton>
            </div>
          </div>
        ) : (
          /* Appointments List View */
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Upcoming Appointments</h3>
            <div className="space-y-4">
              {upcomingAppointments.map(appointment => (
                <div key={appointment.id} className="p-6 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1">{appointment.serviceType}</h4>
                      <p className="text-sm text-gray-400">Appointment ID: {appointment.id}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      appointment.status === 'confirmed'
                        ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                        : 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {appointment.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{appointment.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{appointment.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{appointment.contractor}</span>
                    </div>
                    {appointment.projectTitle && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{appointment.projectTitle}</span>
                      </div>
                    )}
                  </div>

                  {appointment.notes && (
                    <div className="p-3 bg-[#1A1A1A] rounded-lg mb-4">
                      <p className="text-sm text-gray-400">{appointment.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm font-medium transition">
                      Reschedule
                    </button>
                    <button className="flex-1 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white text-sm font-medium transition">
                      Cancel
                    </button>
                  </div>
                </div>
              ))}

              {upcomingAppointments.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Upcoming Appointments</h3>
                  <p className="text-gray-400 mb-6">Schedule your first appointment to get started</p>
                  <button
                    onClick={() => setAppointmentView('calendar')}
                    className="px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] rounded-lg text-white font-medium transition"
                  >
                    <Plus className="w-5 h-5 inline mr-2" />
                    Schedule Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Need Help Scheduling?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Call Us</p>
              <p className="text-sm font-medium text-white">{customerInfo.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Email Us</p>
              <p className="text-sm font-medium text-white">{customerInfo.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Live Chat</p>
              <p className="text-sm font-medium text-white">Available 24/7</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
