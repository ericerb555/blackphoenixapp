import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
  backTo?: string;
  onBack?: () => void;
}

export function PageHeader({ title, description, actions, backTo = '/dashboard', onBack }: PageHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = backTo;
    }
  };

  return (
    <div className="mb-8">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-400 hover:text-[#ea580c] transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">{title}</h1>
          <p className="text-gray-400">{description}</p>
        </div>
        {actions && <div className="flex gap-3">{actions}</div>}
      </div>
    </div>
  );
}