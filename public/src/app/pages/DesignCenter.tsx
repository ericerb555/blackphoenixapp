// DesignCenter.tsx - Design Center wrapper page
// Redirects to Design Studio Pro for now
import DesignStudioPro from './DesignStudioPro';

interface DesignCenterProps {
  onNavigate?: (page: string) => void;
}

export default function DesignCenter({ onNavigate }: DesignCenterProps) {
  return <DesignStudioPro onNavigate={onNavigate} />;
}
