/**
 * Account Lockout Banner
 * 
 * Displays prominent warning banner when account is locked or payment is overdue
 */

import { AlertTriangle, Lock, X, CreditCard, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AccountLockoutBannerProps {
  customerId: string;
}

export function AccountLockoutBanner({ customerId }: AccountLockoutBannerProps) {
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchAccountStatus();
    // Check every 5 minutes
    const interval = setInterval(fetchAccountStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [customerId]);

  const fetchAccountStatus = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/payment/account-status/${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAccountStatus(data);
      }
    } catch (error) {
      console.error('Error fetching account status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !accountStatus || dismissed) return null;
  
  // Don't show if not overdue
  if (!accountStatus.accountLocked && accountStatus.daysOverdue === 0) return null;

  // Account is locked
  if (accountStatus.accountLocked) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-red-700 border-b-4 border-red-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  ACCOUNT LOCKED
                  <span className="px-3 py-1 bg-red-900 text-white text-xs font-bold rounded-full">
                    {accountStatus.daysOverdue} DAYS OVERDUE
                  </span>
                </h3>
                <p className="text-red-100 text-sm mt-1">
                  Your account has been suspended due to overdue payment. 
                  All services have been disabled until payment is received.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <p className="text-xs text-red-200 uppercase font-semibold">Amount Due</p>
                <p className="text-3xl font-bold text-white">${accountStatus.balanceDue.toFixed(2)}</p>
              </div>
              <button
                onClick={() => window.location.href = '/payment'}
                className="px-6 py-3 bg-white hover:bg-red-50 text-red-600 font-bold rounded-lg transition shadow-lg flex items-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Make Payment Now
              </button>
              <button
                onClick={() => window.location.href = 'tel:1-800-XXX-XXXX'}
                className="px-6 py-3 bg-red-800 hover:bg-red-900 text-white font-bold rounded-lg transition flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Call Support
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment overdue but not locked yet
  if (accountStatus.daysOverdue > 0) {
    const daysUntilLock = accountStatus.willLockInDays;
    const urgencyColor = daysUntilLock <= 3 ? 'orange' : 'yellow';
    
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-${urgencyColor}-500 to-${urgencyColor}-600 border-b-4 border-${urgencyColor}-700 shadow-xl`}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  PAYMENT OVERDUE
                  <span className={`px-2 py-0.5 bg-${urgencyColor}-700 text-white text-xs font-bold rounded`}>
                    {accountStatus.daysOverdue} days
                  </span>
                </h3>
                <p className="text-white/90 text-sm">
                  {daysUntilLock > 0 ? (
                    <>Your account will be <strong>locked in {daysUntilLock} day{daysUntilLock !== 1 ? 's' : ''}</strong> if payment is not received.</>
                  ) : (
                    <>Your account will be locked today if payment is not received immediately.</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-3">
                <p className="text-xs text-white/80 uppercase font-semibold">Balance Due</p>
                <p className="text-2xl font-bold text-white">${accountStatus.balanceDue.toFixed(2)}</p>
              </div>
              <button
                onClick={() => window.location.href = '/payment'}
                className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-lg transition shadow-lg flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pay Now
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}