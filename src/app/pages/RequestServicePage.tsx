/**
 * Request Service Page - Combined Signup + Work Request Form
 *
 * For NEW CUSTOMERS clicking "Get a Free Quote":
 * 1. If not logged in → Show signup modal first
 * 2. After signup (or if already logged in) → Show work request form
 * 3. Auto-fills cohort information from quote_request_cohort localStorage
 */

import { useAuth } from '../contexts/AuthContext';
import ClientWorkRequestForm from '../components/forms/ClientWorkRequestForm';
import { useNavigate } from '../hooks/useNavigate';
import { Loader2 } from 'lucide-react';

export default function RequestServicePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  console.log('🎫 [RequestServicePage] Rendering - user:', !!user, 'authLoading:', authLoading);

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

  // Wait for auth to finish resolving so the form can prefill the signed-in
  // customer's details. We do NOT block visitors on sign-in — the work request
  // form is a public lead-capture entry point and supports guest submissions
  // (it falls back to the public anon key + a "guest" upload prefix). Anyone can
  // pick the Quick or Detailed path immediately; account creation happens at (or
  // after) submission rather than being a wall in front of the two options.
  if (authLoading) {
    console.log('🎫 [RequestServicePage] Waiting for auth to resolve');
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading…</p>
        </div>
      </div>
    );
  }

  console.log('🎫 [RequestServicePage] Showing work request form (guest allowed). User:', user?.email || 'guest');
  return (
    <ClientWorkRequestForm
      onClose={handleClose}
      onProjectCreated={handleProjectCreated}
    />
  );
}