/**
 * Role Switcher - Demo/Testing Tool
 * Allows switching between user roles to test different permission levels
 */

import { useState, useContext, useEffect } from 'react';
import { Shield, ChevronDown, Check, Crown, MapPin, Building2, Megaphone, Wrench, User, UserCheck, TrendingUp, Home, KeyRound } from 'lucide-react';
import { useUser } from '../lib/user-context';
import { UserRole, getRoleDisplayName, getRoleColor } from '../lib/rbac';
import { useAuth } from '../contexts/AuthContext';
import { NavigationContext } from '../App';

const OWNER_EMAILS = ['ericerb555@proton.me'];

export function RoleSwitcher() {
  const { user, switchRole, login } = useUser();
  const { isOwner, isAdmin, user: authUser } = useAuth();
  const { navigate } = useContext(NavigationContext);
  const [isOpen, setIsOpen] = useState(false);

  // Hard block — never show to non-owner/non-admin users. The email fallback
  // keeps the real Platform Owner available while ownership tables load or are
  // temporarily unavailable.
  const authEmail = String(authUser?.email || '').trim().toLowerCase();
  const canUse = isOwner || isAdmin || OWNER_EMAILS.includes(authEmail);

  // Supabase sign-in and the legacy preview context load independently. Restore
  // the owner preview identity from the authenticated owner instead of hiding
  // the switcher when current_user was cleared by a sign-out or cache cleanup.
  useEffect(() => {
    if (canUse && !user && authEmail) login(authEmail, '').catch(() => undefined);
  }, [canUse, user, authEmail, login]);

  if (!canUse || !user) return null;

  // Map roles to their portal routes (no leading slash — navigate() handles that)
  const rolePortalMap: Record<UserRole, string> = {
    [UserRole.PLATFORM_OWNER]: 'unified-dashboard',
    [UserRole.ADMIN]: 'admin-portal',
    [UserRole.TERRITORY_ADMIN]: 'territory-portal',
    [UserRole.VENDOR]: 'vendor-portal',
    [UserRole.ADVERTISER]: 'advertiser-portal',
    [UserRole.SUBCONTRACTOR]: 'subcontractor-portal',
    [UserRole.CUSTOMER]: 'customer-portal-app',
    [UserRole.EMPLOYEE]: 'employee-portal',
    [UserRole.INVESTOR]: 'investor-portal',
    [UserRole.PROPERTY_MANAGER]: 'property-manager-portal',
    [UserRole.CONDO_MANAGER]: 'condo-manager-portal',
    [UserRole.LANDLORD]: 'landlord-portal',
  };

  // Mock company profiles per role — lets you test each portal as a different business
  const roleMockProfiles: Partial<Record<UserRole, { name: string; company: string; email: string; territory?: string; phone?: string }>> = {
    [UserRole.ADMIN]: {
      name: 'Jordan Mitchell',
      company: 'Black Phoenix Company',
      email: 'jordan.mitchell@bpteam.com',
      phone: '(214) 555-0088',
    },
    [UserRole.TERRITORY_ADMIN]: {
      name: 'Marcus Johnson',
      company: 'Dallas Metro Home Services',
      email: 'marcus@dallasmhs.com',
      territory: 'Dallas Metro',
      phone: '(214) 555-0191',
    },
    [UserRole.VENDOR]: {
      name: 'Sandra Lee',
      company: 'Premier Building Supplies Co.',
      email: 'sandra@premierbuild.com',
      phone: '(972) 555-0142',
    },
    [UserRole.ADVERTISER]: {
      name: 'Derek Walsh',
      company: 'Premier Home Solutions LLC',
      email: 'derek@premierhs.com',
      phone: '(469) 555-0177',
    },
    [UserRole.SUBCONTRACTOR]: {
      name: 'Carlos Rivera',
      company: 'Elite Construction LLC',
      email: 'carlos@eliteconstruct.com',
      phone: '(817) 555-0163',
    },
    [UserRole.CUSTOMER]: {
      name: 'Jennifer Park',
      company: 'Homeowner',
      email: 'jennifer.park@gmail.com',
      phone: '(214) 555-0284',
    },
    [UserRole.EMPLOYEE]: {
      name: 'Tyler Brooks',
      company: 'Black Phoenix (Field Crew)',
      email: 'tyler.brooks@bpteam.com',
      phone: '(972) 555-0310',
    },
    [UserRole.INVESTOR]: {
      name: 'Robert Chen',
      company: 'Apex Capital Partners',
      email: 'rchen@apexcap.com',
      phone: '(214) 555-0449',
    },
    [UserRole.PROPERTY_MANAGER]: {
      name: 'Angela Torres',
      company: 'Prestige Property Management',
      email: 'angela@prestigepm.com',
      phone: '(469) 555-0521',
    },
    [UserRole.CONDO_MANAGER]: {
      name: 'Brian Foster',
      company: 'Lakewood Heights HOA',
      email: 'bfoster@lakewoodhoa.com',
      phone: '(817) 555-0638',
    },
    [UserRole.LANDLORD]: {
      name: 'Patricia Nguyen',
      company: 'Nguyen Rental Properties',
      email: 'patricia@nguyenrentals.com',
      phone: '(214) 555-0712',
    },
  };

  const handleRoleChange = (newRole: UserRole) => {
    // This is an owner-only, browser-session preview. It never changes Supabase
    // identity, provisioning, invitations, or real portal access records.
    if (newRole === UserRole.PLATFORM_OWNER) sessionStorage.removeItem('role_switching');
    else sessionStorage.setItem('role_switching', 'owner_preview');

    // Inject mock profile for this role so the portal shows realistic demo data
    const mockProfile = roleMockProfiles[newRole];
    if (mockProfile) {
      localStorage.setItem('demo_role_profile', JSON.stringify({ ...mockProfile, role: newRole }));
    } else {
      // Platform owner — clear mock, use real data
      localStorage.removeItem('demo_role_profile');
    }
    switchRole(newRole);
    setIsOpen(false);
    const targetRoute = rolePortalMap[newRole];
    if (targetRoute) {
      // Use the app's navigate() — no full page reload, no blinking
      navigate(targetRoute);
    }
  };

  const roles = [
    {
      role: UserRole.PLATFORM_OWNER,
      icon: Crown,
      label: 'Platform Owner (You)',
      description: 'Eric Erb — full command center access',
      color: 'red'
    },
    {
      role: UserRole.ADMIN,
      icon: Shield,
      label: 'Admin',
      description: 'Jordan Mitchell — dispatch, work orders & operations',
      color: 'rose'
    },
    {
      role: UserRole.TERRITORY_ADMIN,
      icon: MapPin,
      label: 'Territory Partner',
      description: 'Dallas Metro — manages own customers & subs',
      color: 'purple'
    },
    {
      role: UserRole.VENDOR,
      icon: Building2,
      label: 'Vendor / Supplier',
      description: 'Premier Building Supplies — product catalog & orders',
      color: 'blue'
    },
    {
      role: UserRole.ADVERTISER,
      icon: Megaphone,
      label: 'Advertiser / Brand Partner',
      description: 'Premier Home Solutions — campaigns & analytics',
      color: 'pink'
    },
    {
      role: UserRole.SUBCONTRACTOR,
      icon: Wrench,
      label: 'Subcontractor',
      description: 'Elite Construction LLC — jobs, bids & bid room',
      color: 'orange'
    },
    {
      role: UserRole.CUSTOMER,
      icon: User,
      label: 'Customer',
      description: 'Homeowner — work requests, quotes & projects',
      color: 'green'
    },
    {
      role: UserRole.EMPLOYEE,
      icon: UserCheck,
      label: 'Employee',
      description: 'Field crew member — schedules & time tracking',
      color: 'indigo'
    },
    {
      role: UserRole.INVESTOR,
      icon: TrendingUp,
      label: 'Investor',
      description: 'Portfolio investor — opportunities & returns',
      color: 'emerald'
    },
    {
      role: UserRole.PROPERTY_MANAGER,
      icon: Home,
      label: 'Property Manager',
      description: 'Manages condo associations & work requests',
      color: 'amber'
    },
    {
      role: UserRole.CONDO_MANAGER,
      icon: Building2,
      label: 'Condo Manager',
      description: 'HOA board — units, owners & maintenance',
      color: 'cyan'
    },
    {
      role: UserRole.LANDLORD,
      icon: KeyRound,
      label: 'Landlord',
      description: 'Rental portfolio — tenants, leases & maintenance',
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
      rose:  { bg: 'bg-rose-600/20',  border: 'border-rose-500/30',  text: 'text-rose-400',  hover: 'hover:bg-rose-600/30' },
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
