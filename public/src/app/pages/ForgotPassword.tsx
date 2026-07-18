/**
 * Forgot Password Page
 * 
 * Allows users to request a password reset email
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, ArrowRight, Shield, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ForgotPasswordProps {
  onNavigate: (page: string) => void;
}

export default function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-57095a78/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Success State */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Check Your Email</h1>
            <p className="text-gray-400">
              We've sent a password reset link to <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
            <div className="space-y-4 text-center">
              <p className="text-gray-400">
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
              
              <div className="pt-4">
                <p className="text-sm text-gray-500 mb-4">
                  Didn't receive the email? Check your spam folder or request another one.
                </p>
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-[#ea580c] hover:text-orange-400 transition font-medium"
                >
                  Send another email
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
              <button
                onClick={() => onNavigate('login')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] hover:bg-[#2A2A2A] rounded-xl text-white font-bold transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Login
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Forgot Password?</h1>
          <p className="text-gray-400">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-orange-700 hover:shadow-xl hover:shadow-[#ea580c]/50 rounded-xl text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 pt-6 border-t border-[#2A2A2A] text-center">
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
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
