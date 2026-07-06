import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from '../hooks/useNavigate';

interface BackToDashboardProps {
  label?: string;
  showHomeIcon?: boolean;
  className?: string;
}

export function BackToDashboard({ 
  label = 'Back to Dashboard', 
  showHomeIcon = false,
  className = ''
}: BackToDashboardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/unified-dashboard')}
      className={`
        px-4 py-2 rounded-xl border border-gray-700 bg-[#1a1a1a] 
        hover:bg-[#2a2a2a] hover:border-[#ea580c] 
        transition-all flex items-center gap-2 text-white
        ${className}
      `}
      title={label}
    >
      {showHomeIcon ? <Home className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
      <span className="text-sm font-semibold">{showHomeIcon ? 'Dashboard' : 'Back'}</span>
    </button>
  );
}
