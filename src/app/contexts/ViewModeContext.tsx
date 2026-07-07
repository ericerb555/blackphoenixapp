import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export enum PreviewMode {
  OFF = 'OFF',
  ON = 'ON'
}

interface ViewModeContextType {
  previewMode: PreviewMode;
  isPreviewMode: boolean;
  enablePreviewMode: () => void;
  disablePreviewMode: () => void;
  activeViewType: 'admin' | 'client' | 'technician' | 'subcontractor';
  setActiveViewType: (view: 'admin' | 'client' | 'technician' | 'subcontractor') => void;
  isInteractive: boolean;
  shouldMaskSensitiveData: boolean;
  maskData: (data: string, type?: 'email' | 'phone' | 'address' | 'payment') => string;
  previewBanner: {
    show: boolean;
    message: string;
    roleBeingPreviewed: string;
  };
  getEffectiveRole: () => string;
  canExecuteWrite: () => boolean;
  canSendNotification: () => boolean;
  canExecuteWorkflow: () => boolean;
  blockAction: (actionName: string) => { allowed: boolean; reason?: string };
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { isAdmin, isOwner, userRole } = useAuth();
  const [activeViewType, setActiveViewType] = useState<'admin' | 'client' | 'technician' | 'subcontractor'>('admin');
  const [previewMode, setPreviewMode] = useState<PreviewMode>(PreviewMode.OFF);

  const isAdminOrOwner = isAdmin || isOwner;

  const isPreviewMode = isAdminOrOwner && previewMode === PreviewMode.ON;

  const isInteractive = !isPreviewMode;

  const shouldMaskSensitiveData = isPreviewMode;

  const enablePreviewMode = () => {
    if (isAdminOrOwner) {
      setPreviewMode(PreviewMode.ON);
      console.log('[PreviewMode] Preview Mode ENABLED - All write actions blocked');
    }
  };

  const disablePreviewMode = () => {
    setPreviewMode(PreviewMode.OFF);
    console.log('[PreviewMode] Preview Mode DISABLED - Normal operations resumed');
  };

  const getEffectiveRole = (): string => {
    if (previewMode === PreviewMode.ON) {
      const roleMap = {
        'admin': 'admin',
        'client': 'customer',
        'technician': 'technician',
        'subcontractor': 'subcontractor'
      };
      return roleMap[activeViewType];
    }
    return userRole?.role_name || 'customer';
  };

  const canExecuteWrite = (): boolean => {
    if (previewMode === PreviewMode.ON) {
      console.warn('[PreviewMode] Write operation blocked - Preview Mode is ON');
      return false;
    }
    return true;
  };

  const canSendNotification = (): boolean => {
    if (previewMode === PreviewMode.ON) {
      console.warn('[PreviewMode] Notification blocked - Preview Mode is ON');
      return false;
    }
    return true;
  };

  const canExecuteWorkflow = (): boolean => {
    if (previewMode === PreviewMode.ON) {
      console.warn('[PreviewMode] Workflow execution blocked - Preview Mode is ON');
      return false;
    }
    return true;
  };

  const blockAction = (actionName: string): { allowed: boolean; reason?: string } => {
    if (previewMode === PreviewMode.ON) {
      const reason = `Action "${actionName}" blocked: Preview Mode is active. Exit Preview Mode to perform this action.`;
      console.warn(`[PreviewMode] ${reason}`);
      return { allowed: false, reason };
    }
    return { allowed: true };
  };

  useEffect(() => {
    if (!isAdminOrOwner) {
      // NOTE: investor and advertiser roles have isolated dashboards - not included in main app view system
      const roleToViewMap: Record<string, typeof activeViewType> = {
        'customer': 'client',
        'technician': 'technician',
        'subcontractor': 'subcontractor'
      };
      const defaultView = roleToViewMap[userRole?.role_name || ''] || 'client';
      setActiveViewType(defaultView);
    }
  }, [isAdminOrOwner, userRole]);

  useEffect(() => {
    const handleViewTypeChange = (event: CustomEvent) => {
      setActiveViewType(event.detail);
    };

    window.addEventListener('viewTypeChange', handleViewTypeChange as EventListener);
    return () => {
      window.removeEventListener('viewTypeChange', handleViewTypeChange as EventListener);
    };
  }, []);

  const maskData = (data: string, type: 'email' | 'phone' | 'address' | 'payment' = 'email'): string => {
    if (!shouldMaskSensitiveData || !data) return data;

    switch (type) {
      case 'email':
        const [localPart, domain] = data.split('@');
        if (!domain) return data;
        const maskedLocal = localPart.charAt(0) + '***' + localPart.charAt(localPart.length - 1);
        return `${maskedLocal}@${domain}`;

      case 'phone':
        const cleaned = data.replace(/\D/g, '');
        if (cleaned.length === 10) {
          return `(${cleaned.substring(0, 3)}) ***-${cleaned.substring(6)}`;
        }
        return '***-***-' + cleaned.slice(-4);

      case 'address':
        const parts = data.split(',');
        if (parts.length > 0) {
          return parts[0].split(' ')[0] + ' ***' + (parts[parts.length - 1] || '');
        }
        return '*** (Address Hidden)';

      case 'payment':
        const lastFour = data.slice(-4);
        return '**** **** **** ' + lastFour;

      default:
        return '***';
    }
  };

  const getRoleDisplayName = (viewType: typeof activeViewType): string => {
    const nameMap = {
      'admin': 'Admin',
      'client': 'Customer',
      'technician': 'Technician',
      'subcontractor': 'Subcontractor'
    };
    return nameMap[viewType];
  };

  const previewBanner = {
    show: isPreviewMode,
    message: `Previewing ${getRoleDisplayName(activeViewType)} View - Non-Interactive Mode`,
    roleBeingPreviewed: getRoleDisplayName(activeViewType)
  };

  return (
    <ViewModeContext.Provider
      value={{
        previewMode,
        isPreviewMode,
        enablePreviewMode,
        disablePreviewMode,
        activeViewType,
        setActiveViewType,
        isInteractive,
        shouldMaskSensitiveData,
        maskData,
        previewBanner,
        getEffectiveRole,
        canExecuteWrite,
        canSendNotification,
        canExecuteWorkflow,
        blockAction
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
