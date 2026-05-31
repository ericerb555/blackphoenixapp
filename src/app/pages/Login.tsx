/**
 * Login Page
 * 
 * Universal login page for all user types
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { autoSyncBranding } from '../utils/autoSyncBranding';
import SignUpOptionsModal from '../components/SignUpOptionsModal';

interface LoginProps {
  onNavigate: (page: string) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Default to true
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const lastEmail = localStorage.getItem('lastEmail');

    setRememberMe(remembered);
    if (remembered && lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  // Load company logo from branding
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // FIRST: Load from localStorage IMMEDIATELY (instant display)
        const brandingProfile = localStorage.getItem('company_branding_profile');
        if (brandingProfile && brandingProfile !== 'undefined' && brandingProfile !== 'null') {
          const profile = JSON.parse(brandingProfile);

          if (profile.logo_url && profile.logo_url !== 'null' && profile.logo_url !== 'undefined') {
            setCompanyLogo(profile.logo_url);
            console.log('✅ [Login] Logo loaded from cache (' + (profile.logo_url.length / 1024).toFixed(1) + 'KB)');
          }
        }

        // THEN: Sync from database in background (update if changed)
        // Note: autoSyncBranding runs automatically on page load, so we don't need to call it here

      } catch (error) {
        console.error('❌ [Login] Error loading logo:', error);
      }
    };

    loadLogo();

    // Listen for branding updates
    const handleBrandingUpdate = () => {
      console.log('🔔 [Login] Received brandingUpdated event - reloading logo');
      loadLogo();
    };
    window.addEventListener('brandingUpdated', handleBrandingUpdate);

    return () => {
      window.removeEventListener('brandingUpdated', handleBrandingUpdate);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // CRITICAL: Platform owner email check FIRST
      const OWNER_EMAIL = 'ericerb555@proton.me';
      const isOwnerEmail = email.toLowerCase() === OWNER_EMAIL.toLowerCase();

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('lastEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('lastEmail');
      }

      console.log('🔐 Starting sign in process...');
      const { error } = await signIn(email, password);

      if (error) {
        console.error('❌ Sign in failed:', error);
        toast.error(error.message || 'Login failed');
        setIsLoading(false);
        return;
      }

      console.log('✅ Supabase sign in successful, waiting for auth state to update...');

      // Wait for auth state to properly update - check multiple times
      let attempts = 0;
      let authenticated = false;

      while (attempts < 10 && !authenticated) {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if we have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          authenticated = true;
          console.log('✅ Auth state confirmed - user is logged in:', session.user.email);
          break;
        }

        attempts++;
        console.log(`⏳ Waiting for auth... attempt ${attempts}/10`);
      }

      if (!authenticated) {
        console.error('❌ Auth state did not update in time');
        toast.error('Login issue - please try again');
        setIsLoading(false);
        return;
      }

      toast.success('Login successful!');

      // Sync branding from database after successful login
      console.log('🔄 [Login] Syncing branding after successful auth...');
      await autoSyncBranding();

      // Give AuthContext a moment to process the auth state change
      await new Promise(resolve => setTimeout(resolve, 500));

      // ULTRA-CRITICAL: For owner email, force reset profile to ensure clean state
      if (isOwnerEmail) {
        console.log('👑👑👑 OWNER EMAIL LOGIN - FORCING CLEAN PROFILE STATE 👑👑👑');
        console.log('🔍 Current email:', email);
        console.log('🔍 Is owner email?', isOwnerEmail);

        const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
        console.log('📋 Current userProfiles before update:', userProfiles);

        // Force create/update owner profile with correct settings
        const ownerProfile = {
          email: email,
          fullName: 'Eric Erb',
          phone: '6177100058',
          createdAt: userProfiles[email.toLowerCase()]?.createdAt || new Date().toISOString(),
          accountType: 'owner', // FORCE owner type
          status: 'active'
        };

        userProfiles[email.toLowerCase()] = ownerProfile;
        localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
        localStorage.setItem('currentUserProfile', JSON.stringify(ownerProfile));

        console.log('✅✅✅ OWNER PROFILE FORCED:', ownerProfile);
        console.log('📋 Updated userProfiles:', userProfiles);
        console.log('📋 Updated currentUserProfile:', localStorage.getItem('currentUserProfile'));

        toast.success('Welcome back, Platform Owner!');

        console.log('👑 OWNER EMAIL - Redirecting to Owner Dashboard');

        // Use onNavigate instead of window.location for better state management
        onNavigate('owners-dashboard');
        setIsLoading(false);
        return;
      }

      // CRITICAL: Load user profile from localStorage after successful login
      const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
      let userProfile = userProfiles[email.toLowerCase()];

      // MIGRATION: Check if this is the first/only user and upgrade to owner
      const allUsers = Object.keys(userProfiles);
      const hasOwner = allUsers.some(userEmail => {
        const user = userProfiles[userEmail];
        return user.accountType === 'owner' || user.accountType === 'admin' || user.accountType === 'master_admin';
      });

      if (userProfile) {
        // Ensure fullName exists
        if (!userProfile.fullName || userProfile.fullName === 'User') {
          // Create a name from email if not set
          userProfile.fullName = isOwnerEmail ? 'Eric Erb' : email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
        }

        // CRITICAL: Force owner email to always be owner
        if (isOwnerEmail && userProfile.accountType !== 'owner') {
          console.log('👑 FORCE: Setting owner privileges for platform owner email');
          userProfile.accountType = 'owner';
          userProfile.phone = '6177100058'; // Set owner phone
          toast.success('Welcome back, Platform Owner!');
        }
        // MIGRATION: If there's only one user OR no owner exists, make them the owner
        else if (allUsers.length === 1 || !hasOwner) {
          if (userProfile.accountType !== 'owner') {
            console.log('👑 MIGRATION: Upgrading to owner (first/only user)');
            userProfile.accountType = 'owner';
            toast.success('You have been granted owner privileges!', {
              description: 'You are the first user with full access'
            });
          }
        }

        userProfiles[email.toLowerCase()] = userProfile;
        localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
        localStorage.setItem('currentUserProfile', JSON.stringify(userProfile));
        console.log('✅ User profile loaded:', userProfile);
      } else {
        // Create a basic profile for existing users who signed up before profiles were added
        // Check if they're the first user
        const isFirstUser = allUsers.length === 0;
        const userName = isOwnerEmail ? 'Eric Erb' : email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);

        const newProfile = {
          email: email,
          fullName: userName,
          phone: isOwnerEmail ? '6177100058' : undefined,
          createdAt: new Date().toISOString(),
          accountType: isOwnerEmail || isFirstUser || !hasOwner ? 'owner' : 'customer', // Owner email, first user, or no owner = owner
          status: 'active'
        };
        userProfiles[email.toLowerCase()] = newProfile;
        localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
        localStorage.setItem('currentUserProfile', JSON.stringify(newProfile));
        console.log('✅ Created profile for existing user:', newProfile);
        userProfile = newProfile;
      }

      // CRITICAL: Double-check owner email ALWAYS gets owner accountType
      if (isOwnerEmail && userProfile.accountType !== 'owner') {
        console.log('🚨 CRITICAL FIX: Forcing owner accountType for platform owner email');
        userProfile.accountType = 'owner';
        userProfiles[email.toLowerCase()] = userProfile;
        localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
        localStorage.setItem('currentUserProfile', JSON.stringify(userProfile));
      }

      const accountType = userProfile.accountType;
      console.log('🔑 LOGIN: accountType =', accountType);
      console.log('🔑 LOGIN: userProfile =', userProfile);

      // Direct navigation based on account type - routes users to their appropriate dashboard
      const elevatedRoles = ['admin', 'owner', 'master_admin', 'management'];
      const isElevated = elevatedRoles.includes(accountType);

      console.log('🔑 LOGIN: accountType =', accountType, 'isElevated =', isElevated);

      if (isElevated) {
        console.log('✅ Redirecting elevated user to Owner Dashboard');
        onNavigate('owners-dashboard');
      } else {
        // Map account types to their portal pages
        const portalRoutes: Record<string, string> = {
          'customer': 'customer-portal-app',
          'investor': 'investor-portal',
          'advertiser': 'advertiser-portal',
          'vendor': 'vendor-portal',
          'subcontractor': 'subcontractor-portal',
          'employee': 'employee-portal',
        };
        const portalPage = portalRoutes[accountType] || 'customer-portal-app';
        console.log('✅ Redirecting', accountType, 'to:', portalPage);
        onNavigate(portalPage);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl"
      >
        {/* Logo/Header */}
        <div className="text-center mb-18">
          {/* Company Logo - Centered */}
          <div className="flex justify-center mb-10">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company Logo"
                className="w-52 h-52 object-contain"
              />
            ) : (
              <div className="w-42 h-42 rounded-3xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                <Building className="w-20 h-20 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-8xl font-bold text-white mb-5">Welcome Back</h1>
          <p className="text-3xl text-gray-400">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-20">
          <form onSubmit={handleLogin} className="space-y-13">
            {/* Email */}
            <div>
              <label className="block text-2xl font-medium text-gray-400 mb-5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-8 top-1/2 -translate-y-1/2 w-9 h-9 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-24 pr-8 py-8 bg-[#0A0A0A] border-2 border-[#2A2A2A] rounded-xl text-white text-2xl placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-2xl font-medium text-gray-400 mb-5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-8 top-1/2 -translate-y-1/2 w-9 h-9 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-24 pr-24 py-8 bg-[#0A0A0A] border-2 border-[#2A2A2A] rounded-xl text-white text-2xl placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 transition"
                >
                  {showPassword ? <EyeOff className="w-9 h-9" /> : <Eye className="w-9 h-9" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-2xl">
              <label className="flex items-center gap-5 text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-8 h-8 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-[#ea580c] hover:text-orange-400 transition"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-5 px-12 py-9 bg-gradient-to-r from-[#ea580c] to-orange-700 hover:shadow-xl hover:shadow-[#ea580c]/50 rounded-xl text-white text-3xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight className="w-10 h-10" />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-16">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2A2A2A]"></div>
            </div>
            <div className="relative flex justify-center text-2xl">
              <span className="px-8 bg-[#1A1A1A] text-gray-500">Don't have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <button
            onClick={() => setShowSignUpModal(true)}
            className="w-full px-12 py-8 bg-[#0A0A0A] border-2 border-[#2A2A2A] hover:bg-[#2A2A2A] rounded-xl text-white text-3xl font-bold transition-all"
          >
            Create Account
          </button>
        </div>

        {/* Security Badge */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-5 text-2xl text-gray-500">
            <Shield className="w-9 h-9" />
            <span>Secure SSL Connection</span>
          </div>
        </div>
      </motion.div>

      {/* Sign Up Options Modal */}
      <SignUpOptionsModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
      />
    </div>
  );
}