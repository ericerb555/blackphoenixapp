// DesignStructuralHub.tsx - Design & Structural Hub consolidation page
// Redirects to Design Studio Pro for now
import DesignStudioPro from './DesignStudioPro';

interface DesignStructuralHubProps {
  onNavigate?: (page: string) => void;
}

export default function DesignStructuralHub({ onNavigate }: DesignStructuralHubProps) {
  return <DesignStudioPro onNavigate={onNavigate} />;
}
