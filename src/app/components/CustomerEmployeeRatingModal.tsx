/**
 * Customer Employee Rating Modal
 * 
 * Popup after invoice payment to collect customer feedback on:
 * - Technicians who worked on site
 * - Internal staff who interacted with customer
 * - Overall service quality
 * - Specific skill ratings
 * - Comments and feedback
 */

import { useState } from 'react';
import {
  Star, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle,
  User, Wrench, Clock, Award, Send, UserCheck, Heart
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { TextArea } from './ui/input/TextArea';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/modal';

interface Employee {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  skills?: string[];
}

interface CustomerRating {
  employeeId: string;
  employeeName: string;
  overallRating: number; // 1-5
  professionalism: number; // 1-5
  quality: number; // 1-5
  timeliness: number; // 1-5
  communication: number; // 1-5
  skillRatings: { skillName: string; rating: number }[];
  wouldRecommend: boolean | null;
  comments: string;
  timestamp: Date;
}

interface CustomerEmployeeRatingModalProps {
  isOpen: boolean;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  projectDescription: string;
  employees: Employee[]; // Employees who worked on this job
  onClose: () => void;
  onSubmit: (ratings: CustomerRating[]) => void;
}

export default function CustomerEmployeeRatingModal({
  isOpen,
  invoiceId,
  invoiceNumber,
  customerName,
  projectDescription,
  employees,
  onClose,
  onSubmit
}: CustomerEmployeeRatingModalProps) {
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(0);
  const [ratings, setRatings] = useState<CustomerRating[]>([]);
  const [currentRating, setCurrentRating] = useState<Partial<CustomerRating>>({
    employeeId: employees[0]?.id,
    employeeName: employees[0]?.name,
    overallRating: 0,
    professionalism: 0,
    quality: 0,
    timeliness: 0,
    communication: 0,
    skillRatings: [],
    wouldRecommend: null,
    comments: '',
    timestamp: new Date()
  });

  const currentEmployee = employees[currentEmployeeIndex];
  const isLastEmployee = currentEmployeeIndex === employees.length - 1;

  const handleRatingChange = (field: string, value: any) => {
    setCurrentRating(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillRating = (skillName: string, rating: number) => {
    const existingSkillRatings = currentRating.skillRatings || [];
    const updatedSkillRatings = existingSkillRatings.filter(sr => sr.skillName !== skillName);
    updatedSkillRatings.push({ skillName, rating });
    setCurrentRating(prev => ({ ...prev, skillRatings: updatedSkillRatings }));
  };

  const handleNext = () => {
    // Save current rating
    const completeRating: CustomerRating = {
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      overallRating: currentRating.overallRating || 0,
      professionalism: currentRating.professionalism || 0,
      quality: currentRating.quality || 0,
      timeliness: currentRating.timeliness || 0,
      communication: currentRating.communication || 0,
      skillRatings: currentRating.skillRatings || [],
      wouldRecommend: currentRating.wouldRecommend || null,
      comments: currentRating.comments || '',
      timestamp: new Date()
    };

    const updatedRatings = [...ratings];
    updatedRatings[currentEmployeeIndex] = completeRating;
    setRatings(updatedRatings);

    if (isLastEmployee) {
      // Submit all ratings
      onSubmit(updatedRatings);
      toast.success('Thank you for your feedback!');
      onClose();
    } else {
      // Move to next employee
      setCurrentEmployeeIndex(currentEmployeeIndex + 1);
      const nextEmployee = employees[currentEmployeeIndex + 1];
      setCurrentRating({
        employeeId: nextEmployee.id,
        employeeName: nextEmployee.name,
        overallRating: 0,
        professionalism: 0,
        quality: 0,
        timeliness: 0,
        communication: 0,
        skillRatings: [],
        wouldRecommend: null,
        comments: '',
        timestamp: new Date()
      });
    }
  };

  const handleSkip = () => {
    if (isLastEmployee) {
      onSubmit(ratings);
      onClose();
    } else {
      setCurrentEmployeeIndex(currentEmployeeIndex + 1);
      const nextEmployee = employees[currentEmployeeIndex + 1];
      setCurrentRating({
        employeeId: nextEmployee.id,
        employeeName: nextEmployee.name,
        overallRating: 0,
        professionalism: 0,
        quality: 0,
        timeliness: 0,
        communication: 0,
        skillRatings: [],
        wouldRecommend: null,
        comments: '',
        timestamp: new Date()
      });
    }
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 1: return 'text-red-400';
      case 2: return 'text-yellow-400';
      case 3: return 'text-blue-400';
      case 4: return 'text-green-400';
      case 5: return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      closeOnOutsideClick={false}
    >
      <ModalHeader
        title="How Was Your Experience?"
        subtitle={`Invoice #${invoiceNumber} - ${projectDescription}`}
        icon={Heart}
      >
        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            {employees.map((emp, idx) => (
              <div key={emp.id} className="flex items-center gap-2 flex-1">
                <div className={`h-2 rounded-full flex-1 ${
                  idx < currentEmployeeIndex ? 'bg-green-600' :
                  idx === currentEmployeeIndex ? 'bg-orange-600' :
                  'bg-[#2A2A2A]'
                }`}></div>
                {idx < employees.length - 1 && <div className="w-1"></div>}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Rating {currentEmployeeIndex + 1} of {employees.length}
            </p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
          {/* Employee Info */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{currentEmployee.name}</h3>
                <p className="text-gray-400">{currentEmployee.role}</p>
              </div>
            </div>
          </div>

          {/* Overall Rating */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h4 className="text-lg font-bold text-white mb-4">Overall Rating</h4>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => handleRatingChange('overallRating', rating)}
                    className="transition hover:scale-110"
                  >
                    <Star
                      className={`w-12 h-12 ${
                        rating <= (currentRating.overallRating || 0)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600 hover:text-yellow-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {currentRating.overallRating > 0 && (
                <div className={`text-lg font-bold ${getRatingColor(currentRating.overallRating)}`}>
                  {getRatingLabel(currentRating.overallRating)}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Ratings */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h4 className="text-lg font-bold text-white mb-4">Detailed Ratings</h4>
            <div className="space-y-4">
              {/* Professionalism */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Professionalism
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleRatingChange('professionalism', rating)}
                      className="transition hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= (currentRating.professionalism || 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                  {currentRating.professionalism > 0 && (
                    <span className={`ml-2 text-sm font-semibold ${getRatingColor(currentRating.professionalism)}`}>
                      {getRatingLabel(currentRating.professionalism)}
                    </span>
                  )}
                </div>
              </div>

              {/* Quality of Work */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Quality of Work
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleRatingChange('quality', rating)}
                      className="transition hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= (currentRating.quality || 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                  {currentRating.quality > 0 && (
                    <span className={`ml-2 text-sm font-semibold ${getRatingColor(currentRating.quality)}`}>
                      {getRatingLabel(currentRating.quality)}
                    </span>
                  )}
                </div>
              </div>

              {/* Timeliness */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeliness
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleRatingChange('timeliness', rating)}
                      className="transition hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= (currentRating.timeliness || 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                  {currentRating.timeliness > 0 && (
                    <span className={`ml-2 text-sm font-semibold ${getRatingColor(currentRating.timeliness)}`}>
                      {getRatingLabel(currentRating.timeliness)}
                    </span>
                  )}
                </div>
              </div>

              {/* Communication */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Communication
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleRatingChange('communication', rating)}
                      className="transition hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= (currentRating.communication || 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600 hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                  {currentRating.communication > 0 && (
                    <span className={`ml-2 text-sm font-semibold ${getRatingColor(currentRating.communication)}`}>
                      {getRatingLabel(currentRating.communication)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Skill-Specific Ratings */}
          {currentEmployee.skills && currentEmployee.skills.length > 0 && (
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-400" />
                Rate Skills Used on This Job
              </h4>
              <div className="space-y-3">
                {currentEmployee.skills.map(skill => {
                  const skillRating = currentRating.skillRatings?.find(sr => sr.skillName === skill);
                  return (
                    <div key={skill} className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4">
                      <label className="text-white font-medium mb-2 block">{skill}</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            onClick={() => handleSkillRating(skill, rating)}
                            className="transition hover:scale-110"
                          >
                            <Star
                              className={`w-7 h-7 ${
                                rating <= (skillRating?.rating || 0)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-600 hover:text-yellow-400'
                              }`}
                            />
                          </button>
                        ))}
                        {skillRating && (
                          <span className={`ml-2 text-sm font-semibold ${getRatingColor(skillRating.rating)}`}>
                            {getRatingLabel(skillRating.rating)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Would Recommend */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h4 className="text-lg font-bold text-white mb-4">Would you recommend this employee?</h4>
            <div className="flex gap-4">
              <button
                onClick={() => handleRatingChange('wouldRecommend', true)}
                className={`flex-1 p-4 rounded-xl border-2 transition ${
                  currentRating.wouldRecommend === true
                    ? 'border-green-500 bg-green-600/20'
                    : 'border-[#2A2A2A] hover:border-green-500/50'
                }`}
              >
                <ThumbsUp className={`w-8 h-8 mx-auto mb-2 ${
                  currentRating.wouldRecommend === true ? 'text-green-400' : 'text-gray-400'
                }`} />
                <p className={`text-center font-medium ${
                  currentRating.wouldRecommend === true ? 'text-green-400' : 'text-gray-400'
                }`}>
                  Yes
                </p>
              </button>
              <button
                onClick={() => handleRatingChange('wouldRecommend', false)}
                className={`flex-1 p-4 rounded-xl border-2 transition ${
                  currentRating.wouldRecommend === false
                    ? 'border-red-500 bg-red-600/20'
                    : 'border-[#2A2A2A] hover:border-red-500/50'
                }`}
              >
                <ThumbsDown className={`w-8 h-8 mx-auto mb-2 ${
                  currentRating.wouldRecommend === false ? 'text-red-400' : 'text-gray-400'
                }`} />
                <p className={`text-center font-medium ${
                  currentRating.wouldRecommend === false ? 'text-red-400' : 'text-gray-400'
                }`}>
                  No
                </p>
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-400" />
              Additional Comments (Optional)
            </h4>
            <TextArea
              value={currentRating.comments}
              onChange={(value) => handleRatingChange('comments', value)}
              rows={4}
              placeholder="Tell us more about your experience with this employee..."
            />
          </div>
      </ModalBody>

      <ModalFooter>
        <button
          onClick={handleSkip}
          className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          disabled={!currentRating.overallRating}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLastEmployee ? (
            <>
              <Send className="w-5 h-5" />
              Submit Feedback
            </>
          ) : (
            <>
              Next Employee
              <CheckCircle className="w-5 h-5" />
            </>
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}
