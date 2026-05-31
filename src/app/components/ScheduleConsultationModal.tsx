/**
 * Schedule Consultation Modal
 * 
 * Allows advertisers to request consultation calls with advertising specialists
 * Integrates with master scheduling, approval center, and admin alerts
 */

import { useState } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, Building, MessageSquare, AlertCircle, CheckCircle, Sparkles, Video } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ScheduleConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledContext?: string; // e.g., "Materials Hub placement inquiry"
  prefilledPlacements?: string[]; // Pre-selected placements
}

interface ConsultationRequest {
  id: string;
  type: 'consultation';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedBy: string;
  requestDate: string;
  priority: 'high' | 'medium' | 'low';
  
  // Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  
  // Consultation Details
  consultationType: 'phone' | 'video' | 'in-person';
  preferredDate: string;
  preferredTime: string;
  alternateDate?: string;
  alternateTime?: string;
  duration: '30min' | '60min' | '90min';
  
  // Context
  interestedPlacements: string[];
  monthlyBudget: string;
  goals: string;
  additionalNotes: string;
  context?: string;
  
  // Assignment
  assignedTo?: string;
  scheduledDateTime?: string;
  meetingLink?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export default function ScheduleConsultationModal({ 
  isOpen, 
  onClose, 
  prefilledContext,
  prefilledPlacements = []
}: ScheduleConsultationModalProps) {
  const [step, setStep] = useState<'contact' | 'schedule' | 'details' | 'confirm'>('contact');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [consultationType, setConsultationType] = useState<'phone' | 'video' | 'in-person'>('video');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [alternateDate, setAlternateDate] = useState('');
  const [alternateTime, setAlternateTime] = useState('');
  const [duration, setDuration] = useState<'30min' | '60min' | '90min'>('60min');
  
  const [interestedPlacements, setInterestedPlacements] = useState<string[]>(prefilledPlacements);
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [goals, setGoals] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const placementOptions = [
    'Landing Page - All Placements',
    'Subcontractor Portal',
    'Customer Portal',
    'Vendor Portal',
    'Materials Hub',
    'Employee Portal',
    'Investor Portal',
    'Landlord Portal',
    'Condo Association Portal',
    'Multiple Platforms',
    'Not Sure Yet'
  ];

  const budgetRanges = [
    'Under $1,000/month',
    '$1,000 - $2,500/month',
    '$2,500 - $5,000/month',
    '$5,000 - $10,000/month',
    '$10,000+/month',
    'Need consultation to determine'
  ];

  const timeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
  ];

  const handleSubmit = async () => {
    // Validation
    if (!contactName || !contactEmail || !contactPhone) {
      toast.error('Please fill in all contact information');
      return;
    }

    if (!preferredDate || !preferredTime) {
      toast.error('Please select your preferred consultation date and time');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create consultation request
      const request: ConsultationRequest = {
        id: `CONSULT-${Date.now()}`,
        type: 'consultation',
        status: 'pending',
        requestedBy: contactEmail,
        requestDate: new Date().toISOString(),
        priority: monthlyBudget.includes('$10,000+') ? 'high' : 'medium',
        
        contactName,
        contactEmail,
        contactPhone,
        companyName,
        
        consultationType,
        preferredDate,
        preferredTime,
        alternateDate,
        alternateTime,
        duration,
        
        interestedPlacements,
        monthlyBudget,
        goals,
        additionalNotes,
        context: prefilledContext,
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to consultation requests
      const existingRequests = JSON.parse(localStorage.getItem('consultationRequests') || '[]');
      existingRequests.push(request);
      localStorage.setItem('consultationRequests', JSON.stringify(existingRequests));

      // Add to approval center
      const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
      const approvalItem = {
        id: request.id,
        type: 'consultation',
        title: `Consultation Request: ${contactName}`,
        description: `${consultationType} consultation for ${duration} - Interested in: ${interestedPlacements.join(', ')}`,
        requestedBy: contactName,
        requestedByEmail: contactEmail,
        requestDate: new Date().toISOString(),
        priority: request.priority,
        status: 'pending',
        category: 'Advertising Consultation',
        data: request,
        actions: ['approve', 'reject', 'schedule']
      };
      pendingApprovals.push(approvalItem);
      localStorage.setItem('pendingApprovals', JSON.stringify(pendingApprovals));

      // Trigger admin alert
      const adminAlerts = JSON.parse(localStorage.getItem('adminAlerts') || '[]');
      const alert = {
        id: `ALERT-${Date.now()}`,
        type: 'consultation_request',
        severity: request.priority === 'high' ? 'high' : 'medium',
        title: 'New Advertising Consultation Request',
        message: `${contactName} from ${companyName || 'N/A'} has requested a ${consultationType} consultation for ${preferredDate} at ${preferredTime}. Budget: ${monthlyBudget}`,
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: 'approval-center',
        actionLabel: 'Review Request',
        metadata: {
          consultationId: request.id,
          contactEmail,
          budget: monthlyBudget,
          placements: interestedPlacements
        }
      };
      adminAlerts.unshift(alert);
      localStorage.setItem('adminAlerts', JSON.stringify(adminAlerts));

      // Update admin alert count
      const currentCount = parseInt(localStorage.getItem('adminAlertCount') || '0');
      localStorage.setItem('adminAlertCount', (currentCount + 1).toString());

      // Add to master calendar/scheduling
      const scheduledEvents = JSON.parse(localStorage.getItem('scheduledEvents') || '[]');
      const event = {
        id: request.id,
        type: 'consultation',
        title: `Consultation: ${contactName}`,
        description: `${consultationType} consultation - ${goals || 'General advertising consultation'}`,
        startDate: preferredDate,
        startTime: preferredTime,
        duration: duration,
        status: 'pending_approval',
        attendees: [
          {
            name: contactName,
            email: contactEmail,
            phone: contactPhone,
            type: 'client'
          }
        ],
        location: consultationType === 'video' ? 'Video Call (Link TBD)' : 
                  consultationType === 'phone' ? 'Phone Call' : 
                  'Office',
        notes: additionalNotes,
        priority: request.priority,
        createdAt: new Date().toISOString()
      };
      scheduledEvents.push(event);
      localStorage.setItem('scheduledEvents', JSON.stringify(scheduledEvents));

      // Dispatch custom events for real-time updates
      window.dispatchEvent(new CustomEvent('newConsultationRequest', { detail: request }));
      window.dispatchEvent(new CustomEvent('newAdminAlert', { detail: alert }));
      window.dispatchEvent(new CustomEvent('newApprovalItem', { detail: approvalItem }));

      toast.success('Consultation request submitted successfully!');
      
      // Reset form and close modal
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error submitting consultation request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('contact');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setCompanyName('');
    setConsultationType('video');
    setPreferredDate('');
    setPreferredTime('');
    setAlternateDate('');
    setAlternateTime('');
    setDuration('60min');
    setInterestedPlacements(prefilledPlacements);
    setMonthlyBudget('');
    setGoals('');
    setAdditionalNotes('');
  };

  const handleClose = () => {
    if (step !== 'contact' && !isSubmitting) {
      if (confirm('Are you sure you want to cancel? Your progress will be lost.')) {
        resetForm();
        onClose();
      }
    } else {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Schedule Advertising Consultation</h3>
              <p className="text-sm text-gray-400">Free expert guidance - No commitment required</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#1A1A1A] rounded-lg transition"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[
              { id: 'contact', label: 'Contact', icon: User },
              { id: 'schedule', label: 'Schedule', icon: Calendar },
              { id: 'details', label: 'Details', icon: MessageSquare },
              { id: 'confirm', label: 'Confirm', icon: CheckCircle }
            ].map((s, idx) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isCompleted = ['contact', 'schedule', 'details'].indexOf(step) > ['contact', 'schedule', 'details'].indexOf(s.id);
              
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`flex flex-col items-center ${idx > 0 ? 'ml-4' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                      isCompleted ? 'bg-green-600 border-green-600' :
                      isActive ? 'bg-orange-600 border-orange-600' :
                      'bg-[#0A0A0A] border-[#2A2A2A]'
                    }`}>
                      <Icon className={`w-5 h-5 ${isCompleted || isActive ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'text-orange-400' : 'text-gray-500'}`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div className={`w-12 h-0.5 mb-6 ${isCompleted ? 'bg-green-600' : 'bg-[#2A2A2A]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Contact Information */}
          {step === 'contact' && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300">
                    Our advertising specialists will help you choose the best placements for your goals and budget. 
                    This is a <strong className="text-white">free consultation</strong> with no obligation.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Your Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Company Name (Optional)
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Inc."
                    className="w-full pl-11 pr-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Schedule */}
          {step === 'schedule' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Consultation Type <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'video', label: 'Video Call', icon: Video, desc: 'Zoom/Teams' },
                    { value: 'phone', label: 'Phone Call', icon: Phone, desc: 'Voice only' },
                    { value: 'in-person', label: 'In-Person', icon: Building, desc: 'At office' }
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setConsultationType(type.value as any)}
                        className={`p-4 rounded-xl border-2 transition text-left ${
                          consultationType === type.value
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${consultationType === type.value ? 'text-orange-400' : 'text-gray-400'}`} />
                        <div className="font-semibold text-white text-sm">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Duration <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: '30min', label: '30 Minutes', desc: 'Quick chat' },
                    { value: '60min', label: '60 Minutes', desc: 'Standard' },
                    { value: '90min', label: '90 Minutes', desc: 'Deep dive' }
                  ].map((dur) => (
                    <button
                      key={dur.value}
                      onClick={() => setDuration(dur.value as any)}
                      className={`p-4 rounded-xl border-2 transition text-center ${
                        duration === dur.value
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
                      }`}
                    >
                      <Clock className={`w-5 h-5 mx-auto mb-2 ${duration === dur.value ? 'text-orange-400' : 'text-gray-400'}`} />
                      <div className="font-semibold text-white text-sm">{dur.label}</div>
                      <div className="text-xs text-gray-500">{dur.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Preferred Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    min={getMinDate()}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Preferred Time <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  >
                    <option value="">Select time</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <input type="checkbox" className="rounded" />
                  <span>Provide alternate date/time (recommended)</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={alternateDate}
                    onChange={(e) => setAlternateDate(e.target.value)}
                    min={getMinDate()}
                    placeholder="Alternate date"
                    className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:border-orange-500 outline-none transition"
                  />
                  <select
                    value={alternateTime}
                    onChange={(e) => setAlternateTime(e.target.value)}
                    className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:border-orange-500 outline-none transition"
                  >
                    <option value="">Alternate time</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Which platforms interest you?
                </label>
                <div className="space-y-2">
                  {placementOptions.map(option => (
                    <label key={option} className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:border-[#3A3A3A] transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={interestedPlacements.includes(option)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInterestedPlacements([...interestedPlacements, option]);
                          } else {
                            setInterestedPlacements(interestedPlacements.filter(p => p !== option));
                          }
                        }}
                        className="rounded border-gray-500"
                      />
                      <span className="text-white">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Monthly Budget Range
                </label>
                <select
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                >
                  <option value="">Select budget range</option>
                  {budgetRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  What are your advertising goals?
                </label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="E.g., Increase brand awareness, generate leads, drive sales..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any specific questions or requirements?"
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300 font-semibold mb-1">Review Your Information</p>
                  <p className="text-xs text-gray-400">
                    Please review your consultation details before submitting.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-3">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white">{contactName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{contactEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white">{contactPhone}</span>
                    </div>
                    {companyName && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Company:</span>
                        <span className="text-white">{companyName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-3">Consultation Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white capitalize">{consultationType.replace('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white">{duration.replace('min', ' minutes')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Preferred:</span>
                      <span className="text-white">{preferredDate} at {preferredTime}</span>
                    </div>
                    {alternateDate && alternateTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Alternate:</span>
                        <span className="text-white">{alternateDate} at {alternateTime}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-3">Interests</h4>
                  <div className="space-y-2 text-sm">
                    {interestedPlacements.length > 0 && (
                      <div>
                        <span className="text-gray-400">Placements:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {interestedPlacements.map(p => (
                            <span key={p} className="px-2 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs rounded-full">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {monthlyBudget && (
                      <div className="flex justify-between mt-2">
                        <span className="text-gray-400">Budget:</span>
                        <span className="text-white">{monthlyBudget}</span>
                      </div>
                    )}
                    {goals && (
                      <div className="mt-2">
                        <span className="text-gray-400">Goals:</span>
                        <p className="text-white mt-1">{goals}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-gray-300">
                  <strong className="text-white">What happens next?</strong><br/>
                  Your request will be reviewed by our team. You'll receive a confirmation email within 24 hours with meeting details and a calendar invite.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A] bg-[#1A1A1A]">
          <button
            onClick={() => {
              if (step === 'contact') {
                handleClose();
              } else if (step === 'schedule') {
                setStep('contact');
              } else if (step === 'details') {
                setStep('schedule');
              } else if (step === 'confirm') {
                setStep('details');
              }
            }}
            className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 font-semibold rounded-lg transition"
            disabled={isSubmitting}
          >
            {step === 'contact' ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={() => {
              if (step === 'contact') {
                if (!contactName || !contactEmail || !contactPhone) {
                  toast.error('Please fill in all required fields');
                  return;
                }
                setStep('schedule');
              } else if (step === 'schedule') {
                if (!preferredDate || !preferredTime) {
                  toast.error('Please select your preferred date and time');
                  return;
                }
                setStep('details');
              } else if (step === 'details') {
                setStep('confirm');
              } else if (step === 'confirm') {
                handleSubmit();
              }
            }}
            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : step === 'confirm' ? 'Submit Request' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
