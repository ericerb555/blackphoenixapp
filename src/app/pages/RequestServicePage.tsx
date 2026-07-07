/**
 * Request Service Page - Combined Signup + Work Request Form
 *
 * For NEW CUSTOMERS clicking "Get a Free Quote":
 * 1. If not logged in → Show signup modal first
 * 2. After signup (or if already logged in) → Show work request form
 * 3. Auto-fills cohort information from quote_request_cohort localStorage
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ClientWorkRequestForm from '../components/forms/ClientWorkRequestForm';
import SignUpOptionsModal from '../components/SignUpOptionsModal';
import { useNavigate } from '../hooks/useNavigate';
import { Loader2 } from 'lucide-react';

export default function RequestServicePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);
  const navigate = useNavigate();

  console.log('🎫 [RequestServicePage] Rendering - user:', !!user, 'authLoading:', authLoading);

  useEffect(() => {
    console.log('🎫 [RequestServicePage] useEffect - authLoading:', authLoading, 'user:', !!user);
    
    // Wait for auth to finish loading
    if (authLoading) return;

    // If user is not logged in, show signup modal
    if (!user) {
      console.log('🎫 [RequestServicePage] No user found - showing signup modal');
      setShowSignUpModal(true);
    } else {
      console.log('🎫 [RequestServicePage] User is logged in:', user.email);
    }

    setCheckComplete(true);
  }, [user, authLoading]);

  const handleClose = () => {
    console.log('🎫 [RequestServicePage] Closing - navigating to directory');
    // When form is closed, go back to directory landing page
    navigate('directory-landing-page');
  };

  const handleProjectCreated = (projectId: string) => {
    console.log('🎫 [RequestServicePage] Project created:', projectId, '- navigating to pipeline');
    // After project is created, navigate to the project pipeline
    navigate('unified-project-pipeline');
  };

  const handleSignUpClose = () => {
    console.log('🎫 [RequestServicePage] Signup closed - user:', !!user);
    // If user closes signup without completing, go back to directory
    if (!user) {
      console.log('🎫 [RequestServicePage] No user after signup - returning to directory');
      navigate('directory-landing-page');
    } else {
      console.log('🎫 [RequestServicePage] User exists - hiding signup modal');
      setShowSignUpModal(false);
    }
  };

  // Show loading while auth is initializing
  if (authLoading || !checkComplete) {
    console.log('🎫 [RequestServicePage] Showing loading screen');
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show signup modal if user is not logged in
  if (!user) {
    console.log('🎫 [RequestServicePage] Showing signup modal - user not authenticated');
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Request a Service</h1>
            <p className="text-xl text-gray-400">Please sign in or create an account to submit a service request</p>
          </div>
          <SignUpOptionsModal
            isOpen={showSignUpModal}
            onClose={handleSignUpClose}
          />
        </div>
      </div>
    );
  }

  // User is logged in - show the work request form
  console.log('🎫 [RequestServicePage] Showing work request form for user:', user.email);
  return (
    <ClientWorkRequestForm
      onClose={handleClose}
      onProjectCreated={handleProjectCreated}
    />
  );
}