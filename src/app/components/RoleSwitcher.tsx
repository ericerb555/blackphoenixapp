/**
 * Role Switcher - Demo/Testing Tool
 * Allows switching between user roles to test different permission levels
 */

import { useState } from 'react';
import { Shield, ChevronDown, Check, Crown, MapPin, Building2, Megaphone, Wrench, User, UserCheck, TrendingUp, Home, KeyRound } from 'lucide-react';
import { useUser } from '../lib/user-context';
import { UserRole, getRoleDisplayName, getRoleColor } from '../lib/rbac';

export function RoleSwitcher() {
  const { user, switchRole } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  // Map roles to their portal routes
  const rolePortalMap: Record<UserRole, string> = {
    [UserRole.PLATFORM_OWNER]: '/admin-portal',
    [UserRole.TERRITORY_ADMIN]: '/territory-portal',
    [UserRole.VENDOR]: '/vendor-portal',
    [UserRole.ADVERTISER]: '/advertiser-portal',
    [UserRole.SUBCONTRACTOR]: '/subcontractor-portal',
    [UserRole.CUSTOMER]: '/customer-portal-app',
    [UserRole.EMPLOYEE]: '/employee-portal',
    [UserRole.INVESTOR]: '/investor-portal',
    [UserRole.PROPERTY_MANAGER]: '/property-manager-portal',
    [UserRole.CONDO_MANAGER]: '/condo-manager-portal',
    [UserRole.LANDLORD]: '/landlord-portal',
  };

  const handleRoleChange = (newRole: UserRole) => {
    console.log(`🔄 RoleSwitcher: Changing role to ${newRole}`);

    // Switch the role in context
    switchRole(newRole);
    setIsOpen(false);

    // Navigate to the appropriate portal with a small delay to let role update settle
    const targetRoute = rolePortalMap[newRole];
    if (targetRoute) {
      console.log(`🔄 RoleSwitcher: Will navigate to ${targetRoute} after role update`);

      // Use setTimeout to avoid redirect loops with ProtectedRoutes
      setTimeout(() => {
        console.log(`✅ RoleSwitcher: Navigating to ${targetRoute}`);
        window.location.href = targetRoute;
      }, 100);
    }
  };

  const roles = [
    {
      role: UserRole.PLATFORM_OWNER,
      icon: Crown,
      label: 'Platform Owner',
      description: 'Command Center - Full access',
      color: 'red'
    },
    {
      role: UserRole.TERRITORY_ADMIN,
      icon: MapPin,
      label: 'Territory Admin',
      description: 'Territory portal view',
      color: 'purple'
    },
    {
      role: UserRole.VENDOR,
      icon: Building2,
      label: 'Vendor',
      description: 'Vendor portal view',
      color: 'blue'
    },
    {
      role: UserRole.ADVERTISER,
      icon: Megaphone,
      label: 'Advertiser',
      description: 'Advertiser portal view',
      color: 'pink'
    },
    {
      role: UserRole.SUBCONTRACTOR,
      icon: Wrench,
      label: 'Subcontractor',
      description: 'Subcontractor portal view',
      color: 'orange'
    },
    {
      role: UserRole.CUSTOMER,
      icon: User,
      label: 'Customer',
      description: 'Customer portal view',
      color: 'green'
    },
    {
      role: UserRole.EMPLOYEE,
      icon: UserCheck,
      label: 'Employee',
      description: 'Employee portal view',
      color: 'indigo'
    },
    {
      role: UserRole.INVESTOR,
      icon: TrendingUp,
      label: 'Investor',
      description: 'Investor portal view',
      color: 'emerald'
    },
    {
      role: UserRole.PROPERTY_MANAGER,
      icon: Home,
      label: 'Property Manager',
      description: 'Property Manager portal view',
      color: 'amber'
    },
    {
      role: UserRole.CONDO_MANAGER,
      icon: Building2,
      label: 'Condo Manager',
      description: 'Condo Manager portal view',
      color: 'cyan'
    },
    {
      role: UserRole.LANDLORD,
      icon: KeyRound,
      label: 'Landlord',
      description: 'Landlord portal view',
      color: 'teal'
    },
  ];

  const currentRoleData = roles.find(r => r.role === user.role);
  const CurrentIcon = currentRoleData?.icon || Shield;

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      red: { bg: 'bg-red-600/20', border: 'border-red-500/30', text: 'text-red-400', hover: 'hover:bg-red-600/30' },
      purple: { bg: 'bg-purple-600/20', border: 'border-purple-500/30', text: 'text-purple-400', hover: 'hover:bg-purple-600/30' },
      blue: { bg: 'bg-blue-600/20', border: 'border-blue-500/30', text: 'text-blue-400', hover: 'hover:bg-blue-600/30' },
      pink: { bg: 'bg-pink-600/20', border: 'border-pink-500/30', text: 'text-pink-400', hover: 'hover:bg-pink-600/30' },
      orange: { bg: 'bg-orange-600/20', border: 'border-orange-500/30', text: 'text-orange-400', hover: 'hover:bg-orange-600/30' },
      green: { bg: 'bg-green-600/20', border: 'border-green-500/30', text: 'text-green-400', hover: 'hover:bg-green-600/30' },
      indigo: { bg: 'bg-indigo-600/20', border: 'border-indigo-500/30', text: 'text-indigo-400', hover: 'hover:bg-indigo-600/30' },
      emerald: { bg: 'bg-emerald-600/20', border: 'border-emerald-500/30', text: 'text-emerald-400', hover: 'hover:bg-emerald-600/30' },
      cyan: { bg: 'bg-cyan-600/20', border: 'border-cyan-500/30', text: 'text-cyan-400', hover: 'hover:bg-cyan-600/30' },
      teal: { bg: 'bg-teal-600/20', border: 'border-teal-500/30', text: 'text-teal-400', hover: 'hover:bg-teal-600/30' },
      amber: { bg: 'bg-amber-600/20', border: 'border-amber-500/30', text: 'text-amber-400', hover: 'hover:bg-amber-600/30' },
    };
    return colors[color] || colors.blue;
  };

  const currentColors = getColorClasses(currentRoleData?.color || 'blue');

  return (
    <div className="relative">
      {/* Current Role Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 ${currentColors.bg} border ${currentColors.border} rounded-lg ${currentColors.hover} transition-all`}
      >
        <CurrentIcon className={`w-5 h-5 ${currentColors.text}`} />
        <div className="text-left">
          <p className="text-sm font-semibold text-white leading-tight">{currentRoleData?.label}</p>
          <p className="text-xs text-zinc-400">{user.email}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-[#1A1A1A] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 border-b border-zinc-800 bg-[#0A0A0A]">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-[#ea580c]" />
                <p className="text-xs font-semibold text-white uppercase tracking-wider">Role Switcher</p>
              </div>
              <p className="text-xs text-zinc-500">Demo mode - Switch roles to test permissions</p>
              <p className="text-xs text-zinc-400 mt-1">⚡ Non-owners are redirected to their portal view</p>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {roles.map(({ role, icon: Icon, label, description, color }) => {
                const isActive = user.role === role;
                const colors = getColorClasses(color);
                
                return (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-all ${
                      isActive
                        ? `${colors.bg} border-l-2 ${colors.border}`
                        : 'hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{label}</p>
                        {isActive && <Check className="w-4 h-4 text-green-400" />}
                      </div>
                      <p className="text-xs text-zinc-400">{description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="p-3 border-t border-zinc-800 bg-[#0A0A0A]">
              <p className="text-xs text-zinc-500 text-center">
                Current: <span className="font-semibold text-white">{getRoleDisplayName(user.role)}</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
