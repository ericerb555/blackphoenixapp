import { lazy, Suspense } from 'react';
import { Loader } from 'lucide-react';

const ClientWorkRequestForm = lazy(() => import('./ClientWorkRequestForm'));

interface WorkRequestFormWrapperProps {
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

export default function WorkRequestFormWrapper({ onClose, onProjectCreated }: WorkRequestFormWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Loading form...</p>
          </div>
        </div>
      }
    >
      <ClientWorkRequestForm onClose={onClose} onProjectCreated={onProjectCreated} />
    </Suspense>
  );
}
