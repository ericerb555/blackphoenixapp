/**
 * Rating & Review Request Modal
 * 
 * Post-payment rating system for:
 * - Employees
 * - Subcontractors
 * - Job/Project quality
 * - Overall experience
 */

import { useState } from 'react';
import { X, Star, User, Users, Briefcase, Send, CheckCircle } from 'lucide-react';
import StarRating from './StarRating';

interface Worker {
  id: string;
  name: string;
  role: 'employee' | 'subcontractor';
  avatar?: string;
}

interface RatingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  projectName: string;
  workers: Worker[];
  onSubmit: (ratings: any) => void;
}

export default function RatingRequestModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  projectName,
  workers,
  onSubmit
}: RatingRequestModalProps) {
  const [step, setStep] = useState<'intro' | 'workers' | 'project' | 'comments' | 'complete'>('intro');
  const [workerRatings, setWorkerRatings] = useState<Record<string, { rating: number; comment: string }>>({});
  const [projectRating, setProjectRating] = useState(0);
  const [projectComment, setProjectComment] = useState('');
  const [overallComment, setOverallComment] = useState('');

  if (!isOpen) return null;

  const handleWorkerRating = (workerId: string, rating: number) => {
    setWorkerRatings(prev => ({
      ...prev,
      [workerId]: { ...prev[workerId], rating }
    }));
  };

  const handleWorkerComment = (workerId: string, comment: string) => {
    setWorkerRatings(prev => ({
      ...prev,
      [workerId]: { ...prev[workerId], comment }
    }));
  };

  const handleSubmit = () => {
    const ratingsData = {
      invoiceId,
      invoiceNumber,
      projectName,
      timestamp: new Date().toISOString(),
      workerRatings: Object.entries(workerRatings).map(([workerId, data]) => ({
        workerId,
        workerName: workers.find(w => w.id === workerId)?.name,
        workerRole: workers.find(w => w.id === workerId)?.role,
        rating: data.rating,
        comment: data.comment
      })),
      projectRating,
      projectComment,
      overallComment
    };

    onSubmit(ratingsData);
    setStep('complete');
  };

  const canProceed = () => {
    switch (step) {
      case 'workers':
        return workers.every(w => workerRatings[w.id]?.rating > 0);
      case 'project':
        return projectRating > 0;
      default:
        return true;
    }
  };

  const renderIntro = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <Star className="w-8 h-8 text-white fill-white" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Thank You for Your Payment!</h3>
      <p className="text-gray-400 mb-6">
        We'd love to hear about your experience with this project.
      </p>
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 mb-6">
        <div className="text-sm text-gray-400 mb-1">Invoice #{invoiceNumber}</div>
        <div className="text-lg font-semibold text-white">{projectName}</div>
      </div>
      <p className="text-sm text-gray-400 mb-8">
        Your feedback helps us maintain quality and recognize outstanding work.
      </p>
      <button
        onClick={() => setStep('workers')}
        className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30"
      >
        Start Review
      </button>
      <button
        onClick={onClose}
        className="block mx-auto mt-4 text-sm text-gray-500 hover:text-gray-400"
      >
        Maybe Later
      </button>
    </div>
  );

  const renderWorkerRatings = () => (
    <div>
      <h3 className="text-xl font-bold text-white mb-2">Rate the Team</h3>
      <p className="text-sm text-gray-400 mb-6">
        How would you rate each team member who worked on this project?
      </p>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {workers.map((worker) => (
          <div key={worker.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                {worker.avatar || worker.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">{worker.name}</h4>
                <p className="text-xs text-gray-400 capitalize">{worker.role}</p>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-2">Rating</label>
              <StarRating
                rating={workerRatings[worker.id]?.rating || 0}
                onRatingChange={(rating) => handleWorkerRating(worker.id, rating)}
                size="lg"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={workerRatings[worker.id]?.comment || ''}
                onChange={(e) => handleWorkerComment(worker.id, e.target.value)}
                placeholder="Share your experience with this team member..."
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setStep('intro')}
          className="flex-1 py-3 bg-[#1A1A1A] hover:bg-[#252525] text-white font-medium rounded-xl border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all duration-200"
        >
          Back
        </button>
        <button
          onClick={() => setStep('project')}
          disabled={!canProceed()}
          className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30 disabled:shadow-none"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderProjectRating = () => (
    <div>
      <h3 className="text-xl font-bold text-white mb-2">Rate the Project</h3>
      <p className="text-sm text-gray-400 mb-6">
        How would you rate the overall quality and outcome of this project?
      </p>

      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Overall Project Rating
          </label>
          <div className="flex justify-center">
            <StarRating
              rating={projectRating}
              onRatingChange={setProjectRating}
              size="xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Project Comments (Optional)
          </label>
          <textarea
            value={projectComment}
            onChange={(e) => setProjectComment(e.target.value)}
            placeholder="Tell us about the project quality, timeline, communication, etc..."
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
            rows={4}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep('workers')}
          className="flex-1 py-3 bg-[#1A1A1A] hover:bg-[#252525] text-white font-medium rounded-xl border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all duration-200"
        >
          Back
        </button>
        <button
          onClick={() => setStep('comments')}
          disabled={!canProceed()}
          className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30 disabled:shadow-none"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderComments = () => (
    <div>
      <h3 className="text-xl font-bold text-white mb-2">Additional Comments</h3>
      <p className="text-sm text-gray-400 mb-6">
        Any other feedback you'd like to share? (Optional)
      </p>

      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-6">
        <textarea
          value={overallComment}
          onChange={(e) => setOverallComment(e.target.value)}
          placeholder="Share any additional thoughts, suggestions, or concerns..."
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
          rows={6}
        />
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-300">
          <strong>Privacy Note:</strong> Your ratings help us maintain quality. 
          Worker ratings are used internally for performance evaluation.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep('project')}
          className="flex-1 py-3 bg-[#1A1A1A] hover:bg-[#252525] text-white font-medium rounded-xl border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all duration-200"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Submit Review
        </button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-400" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
      <p className="text-gray-400 mb-6">
        Your feedback has been submitted successfully.
      </p>
      <button
        onClick={onClose}
        className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30"
      >
        Close
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Customer Review</h2>
            {step !== 'intro' && step !== 'complete' && (
              <div className="flex items-center gap-2 mt-1">
                <div className={`h-1 w-16 rounded ${step === 'workers' || step === 'project' || step === 'comments' ? 'bg-orange-500' : 'bg-[#2A2A2A]'}`} />
                <div className={`h-1 w-16 rounded ${step === 'project' || step === 'comments' ? 'bg-orange-500' : 'bg-[#2A2A2A]'}`} />
                <div className={`h-1 w-16 rounded ${step === 'comments' ? 'bg-orange-500' : 'bg-[#2A2A2A]'}`} />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'intro' && renderIntro()}
          {step === 'workers' && renderWorkerRatings()}
          {step === 'project' && renderProjectRating()}
          {step === 'comments' && renderComments()}
          {step === 'complete' && renderComplete()}
        </div>
      </div>
    </div>
  );
}
