/**
 * Login Page
 * 
 * Universal login page for all user types
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Building, Shield } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onNavigate: (page: string) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { signIn, enableDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Default to true

  // Load remembered email on mount
  useEffect(() => {
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const lastEmail = localStorage.getItem('lastEmail');
    
    setRememberMe(remembered);
    if (remembered && lastEmail) {
      setEmail(lastEmail);
    }
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

      const { error } = await signIn(email, password);

      if (error) {
        toast.error(error.message || 'Login failed');
        setIsLoading(false);
        return;
      }

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

        // IMMEDIATE redirect - don't process any other logic
        console.log('👑👑👑 OWNER EMAIL - IMMEDIATE REDIRECT TO COMMAND CENTER 👑👑👑');
        console.log('🚀 About to call window.location.replace("/unified-dashboard")');

        // Set a flag to prevent any other redirects
        sessionStorage.setItem('OWNER_LOGIN_REDIRECT', 'true');

        setTimeout(() => {
          console.log('🚀 EXECUTING REDIRECT NOW');
          window.location.replace('/unified-dashboard');
        }, 100);

        return; // EXIT IMMEDIATELY
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

      toast.success(`Login successful! Welcome ${userProfile.fullName}!`);

      // CRITICAL: Owner email ALWAYS goes to command center, no exceptions
      if (isOwnerEmail) {
        console.log('👑 OWNER EMAIL DETECTED - FORCING REDIRECT TO COMMAND CENTER');
        // Use replace to prevent back button issues
        window.location.replace('/unified-dashboard');
        return; // Exit immediately
      }

      // Direct navigation based on account type for other users
      const elevatedRoles = ['admin', 'owner', 'master_admin', 'management'];
      const isElevated = elevatedRoles.includes(accountType);

      console.log('🔑 LOGIN: isElevated =', isElevated);
      console.log('🔑 LOGIN: Redirecting to:', isElevated ? '/unified-dashboard' : 'portal');

      // Immediate redirect - don't wait
      if (isElevated) {
        console.log('🔑 LOGIN: FORCING REDIRECT TO COMMAND CENTER');
        window.location.replace('/unified-dashboard');
      } else {
        const portalRoutes: Record<string, string> = {
          'customer': '/customer-portal-app',
          'investor': '/investor-portal',
          'advertiser': '/advertiser-portal',
          'vendor': '/vendor-portal',
          'subcontractor': '/subcontractor-portal',
          'employee': '/employee-portal',
        };
        const portalUrl = portalRoutes[accountType] || '/customer-portal-app';
        console.log('🔑 LOGIN: FORCING REDIRECT TO PORTAL:', portalUrl);
        window.location.replace(portalUrl);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleDemoMode = () => {
    enableDemoMode();
    toast.success('Demo mode enabled! Choose any portal to explore.');
    // Use window.location.href for immediate navigation before ProtectedRoutes can redirect
    window.location.href = '/portal-demo-hub';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#ea580c] focus:ring-[#ea580c]"
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
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-orange-700 hover:shadow-xl hover:shadow-[#ea580c]/50 rounded-xl text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2A2A2A]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#1A1A1A] text-gray-500">Don't have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <button
            onClick={() => onNavigate('signup')}
            className="w-full px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] hover:bg-[#2A2A2A] rounded-xl text-white font-bold transition-all"
          >
            Create Account
          </button>

          {/* Demo Mode Button */}
          <div className="mt-4">
            <button
              onClick={handleDemoMode}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-xl hover:shadow-purple-500/50 rounded-xl text-white font-bold transition-all"
            >
              🚀 Enter Demo Mode (Skip Login)
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Choose any portal to demo all views and features
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure SSL Connection</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}