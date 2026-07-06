/**
 * Admin Alerts Page
 * 
 * Central hub for all administrative alerts including:
 * - Approved quotes (ready for contract generation)
 * - System notifications
 * - User actions
 * - Critical issues
 */

import AdminAlertsPanel from '../components/AdminAlertsPanel';

interface AdminAlertsProps {
  onNavigate?: (page: string) => void;
}

export default function AdminAlerts({ onNavigate }: AdminAlertsProps) {
  return <AdminAlertsPanel onNavigate={onNavigate} />;
}