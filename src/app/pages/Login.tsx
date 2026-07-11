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
    if (isLoading) return;
    setIsLoading(true);

    const OWNER_EMAIL = 'ericerb555@proton.me';
    const isOwnerEmail = email.toLowerCase() === OWNER_EMAIL.toLowerCase();

    try {
      // Persist remember-me before any async work
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('lastEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('lastEmail');
      }

      const { error } = await signIn(email, password);

      if (error) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          toast.error('Incorrect email or password. Please try again or reset your password.');
        } else if (msg.includes('email not confirmed')) {
          toast.error('Please confirm your email before signing in.');
        } else if (msg.includes('too many requests')) {
          toast.error('Too many attempts. Please wait a few minutes and try again.');
        } else {
          toast.error(error.message || 'Login failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // ── signIn succeeded — Supabase session is live ───────────────────────
      // Update user profile in localStorage (sync, no network calls needed here)
      const userProfiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
      const allUsers = Object.keys(userProfiles);
      const hasOwner = allUsers.some(k => ['owner', 'admin', 'master_admin'].includes(userProfiles[k]?.accountType));
      const userName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

      let profile = userProfiles[email.toLowerCase()] || {
        email,
        fullName: userName,
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      // Ensure fullName is meaningful
      if (!profile.fullName || profile.fullName === 'User') profile.fullName = userName;

      // Determine account type
      if (isOwnerEmail) {
        profile.accountType = 'owner';
        profile.phone = profile.phone || '6177100058';
      } else if (!hasOwner || allUsers.length === 0) {
        profile.accountType = 'owner'; // first user or no owner yet
      } else if (!profile.accountType) {
        profile.accountType = 'customer';
      }

      userProfiles[email.toLowerCase()] = profile;
      localStorage.setItem('userProfiles', JSON.stringify(userProfiles));
      localStorage.setItem(`currentUserProfile_${email.toLowerCase()}`, JSON.stringify(profile));

      // Sync branding in background — don't await, don't block navigation
      autoSyncBranding().catch(() => {});

      toast.success(isOwnerEmail ? 'Welcome back, Platform Owner!' : 'Login successful!');

      // Navigate immediately — no polling, no artificial delays
      const elevatedRoles = ['admin', 'owner', 'master_admin', 'management'];
      if (elevatedRoles.includes(profile.accountType)) {
        onNavigate('owners-dashboard');
      } else {
        const portalRoutes: Record<string, string> = {
          customer: 'customer-portal-app',
          investor: 'investor-portal',
          advertiser: 'advertiser-portal',
          vendor: 'vendor-portal',
          subcontractor: 'subcontractor-portal',
          employee: 'employee-portal',
        };
        onNavigate(portalRoutes[profile.accountType] || 'customer-portal-app');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Login error:', err);
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" className="w-24 h-24 object-contain" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Welcome Back</h1>
          <p className="text-gray-400 text-sm">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Address</label>
              <div className="flex items-center bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl focus-within:border-[#ea580c] transition">
                <div className="flex-shrink-0 flex items-center justify-center w-11 h-full py-3">
                  <Mail className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 min-w-0 pr-3 py-3 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <div className="flex items-center bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl focus-within:border-[#ea580c] transition">
                <div className="flex-shrink-0 flex items-center justify-center w-11 h-full py-3">
                  <Lock className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 min-w-0 py-3 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex-shrink-0 flex items-center justify-center w-11 h-full py-3 text-gray-500 hover:text-gray-400 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <button type="button" onClick={() => onNavigate('forgot-password')}
                className="text-[#ea580c] hover:text-orange-400 transition text-sm">
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#ea580c] to-orange-700 hover:shadow-lg hover:shadow-[#ea580c]/30 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2A2A2A]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#1A1A1A] text-gray-500">Don't have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <button onClick={() => setShowSignUpModal(true)}
            className="w-full px-6 py-3.5 bg-[#0A0A0A] border border-[#2A2A2A] hover:bg-[#2A2A2A] rounded-xl text-white text-sm font-bold transition-all">
            Create Account
          </button>
        </div>

        {/* Security Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-500">
            <Shield className="w-4 h-4" />
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