import { useState, useEffect } from 'react';
import { X, Mail, Smartphone, Key, Shield, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface OwnerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => void;
  grantDetails: {
    type: string;
    customer: string;
    amount: string;
    value: string;
    reason: string;
  };
}

export default function OwnerVerificationModal({ 
  isOpen, 
  onClose, 
  onVerify,
  grantDetails 
}: OwnerVerificationModalProps) {
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'sms'>('email');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [codeSent, setCodeSent] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (codeSent && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [codeSent, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendCode = () => {
    setCodeSent(true);
    setTimeRemaining(300);
    toast.success(
      `Verification code sent to ${verificationMethod === 'email' ? 'owner@company.com' : '+1 (555) 123-4567'}`
    );
  };

  const handleResendCode = () => {
    setVerificationCode(['', '', '', '', '', '']);
    setTimeRemaining(300);
    toast.success('New verification code sent!');
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-verify when all digits are entered
    if (newCode.every(digit => digit !== '') && index === 5) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (code: string) => {
    setIsVerifying(true);
    
    // Simulate verification process
    setTimeout(() => {
      // In a real app, this would verify with backend
      const isValid = code === '123456'; // Demo code
      
      if (isValid) {
        toast.success('✅ Owner verified! Grant approved.');
        onVerify(code);
        onClose();
      } else {
        toast.error('❌ Invalid verification code. Please try again.');
        setVerificationCode(['', '', '', '', '', '']);
        document.getElementById('code-input-0')?.focus();
      }
      setIsVerifying(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-orange-500/30 rounded-2xl max-w-2xl w-full shadow-2xl shadow-orange-500/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Owner Verification Required</h2>
                <p className="text-white/80 text-sm">Confirm your identity to authorize this grant</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Grant Details Summary */}
          <div className="bg-gradient-to-br from-orange-600/10 to-yellow-600/10 border border-orange-500/30 rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              Grant Authorization Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Grant Type</div>
                <div className="text-sm font-semibold text-white">{grantDetails.type}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Customer</div>
                <div className="text-sm font-semibold text-white">{grantDetails.customer}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Amount</div>
                <div className="text-sm font-semibold text-orange-400">{grantDetails.amount}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Estimated Value</div>
                <div className="text-sm font-semibold text-green-400">{grantDetails.value}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-gray-400 mb-1">Reason</div>
              <div className="text-sm text-gray-300">{grantDetails.reason}</div>
            </div>
          </div>

          {!codeSent ? (
            <>
              {/* Verification Method Selection */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Choose Verification Method</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setVerificationMethod('email')}
                    className={`p-4 rounded-xl border-2 transition ${
                      verificationMethod === 'email'
                        ? 'border-blue-500 bg-blue-600/10'
                        : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-blue-500/50'
                    }`}
                  >
                    <Mail className={`w-6 h-6 mb-2 ${verificationMethod === 'email' ? 'text-blue-400' : 'text-gray-400'}`} />
                    <div className="text-sm font-semibold text-white mb-1">Email</div>
                    <div className="text-xs text-gray-400">owner@company.com</div>
                  </button>

                  <button
                    onClick={() => setVerificationMethod('sms')}
                    className={`p-4 rounded-xl border-2 transition ${
                      verificationMethod === 'sms'
                        ? 'border-green-500 bg-green-600/10'
                        : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-green-500/50'
                    }`}
                  >
                    <Smartphone className={`w-6 h-6 mb-2 ${verificationMethod === 'sms' ? 'text-green-400' : 'text-gray-400'}`} />
                    <div className="text-sm font-semibold text-white mb-1">SMS</div>
                    <div className="text-xs text-gray-400">+1 (555) 123-4567</div>
                  </button>
                </div>
              </div>

              {/* Send Code Button */}
              <button
                onClick={handleSendCode}
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-lg shadow-lg shadow-orange-500/20"
              >
                <Key className="w-5 h-5" />
                Send Verification Code
              </button>
            </>
          ) : (
            <>
              {/* Code Entry */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white">Enter Verification Code</h4>
                  <div className="flex items-center gap-2">
                    <div className={`text-sm font-semibold ${timeRemaining < 60 ? 'text-red-400' : 'text-blue-400'}`}>
                      {formatTime(timeRemaining)}
                    </div>
                    <button
                      onClick={handleResendCode}
                      className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                      disabled={timeRemaining > 240}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Resend
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 justify-center mb-4">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-input-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-14 h-16 text-center text-2xl font-bold bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 outline-none transition"
                      disabled={isVerifying}
                    />
                  ))}
                </div>

                <div className="text-center text-sm text-gray-400 mb-4">
                  Code sent to {verificationMethod === 'email' ? 'owner@company.com' : '+1 (555) 123-4567'}
                </div>

                {/* Demo Code Hint */}
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div className="text-xs text-blue-400">
                      <strong>Demo Mode:</strong> Use code <span className="font-mono font-bold">123456</span> to verify
                    </div>
                  </div>
                </div>

                {isVerifying && (
                  <div className="flex items-center justify-center gap-2 text-orange-400 py-4">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="font-semibold">Verifying...</span>
                  </div>
                )}
              </div>

              {/* Manual Verify Button */}
              <button
                onClick={() => handleVerify(verificationCode.join(''))}
                disabled={verificationCode.some(d => !d) || isVerifying}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-lg shadow-lg shadow-green-500/20"
              >
                <CheckCircle className="w-5 h-5" />
                Verify & Approve Grant
              </button>
            </>
          )}

          {/* Security Notice */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-white mb-1">Security Notice</div>
                <div className="text-xs text-gray-400">
                  Owner verification is required for all grant authorizations to prevent unauthorized distribution of free services, subscriptions, and credits. This verification code will expire in 5 minutes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
