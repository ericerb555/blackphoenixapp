import { useEffect, useMemo, useState } from "react";
import {
  Bell, CalendarDays, ChevronRight, ClipboardList, CreditCard, Crown, FileText,
  Home, LayoutDashboard, MessageCircle, MoreHorizontal, ShieldCheck, Sparkles,
  Users, WalletCards, Wrench, X, ShoppingBag, type LucideIcon,
} from "lucide-react";

type MobilePortalShellProps = {
  page: string;
  navigate: (page: string) => void;
};

type PortalDefinition = {
  label: string;
  eyebrow: string;
  home: string;
  primary: { label: string; route: string; icon: LucideIcon };
  items: { label: string; route: string; icon: LucideIcon }[];
};

const PORTALS: Record<string, PortalDefinition> = {
  "customer-portal": {
    label: "Customer Portal", eyebrow: "Your Black Phoenix home", home: "customer-portal",
    primary: { label: "Open my account", route: "customer-portal-app", icon: LayoutDashboard },
    items: [
      { label: "Request service", route: "request-service", icon: Wrench },
      { label: "Pay or view invoices", route: "payment-center", icon: CreditCard },
      { label: "Plans & maintenance", route: "maintenance-plans", icon: ShieldCheck },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "customer-portal-app": {
    label: "Customer Portal", eyebrow: "Your Black Phoenix home", home: "customer-portal-app",
    primary: { label: "Request service", route: "request-service", icon: Wrench },
    items: [
      { label: "My projects", route: "projects", icon: ClipboardList },
      { label: "Pay or view invoices", route: "payment-center", icon: CreditCard },
      { label: "Plans & maintenance", route: "maintenance-plans", icon: ShieldCheck },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "employee-portal": {
    label: "Field Portal", eyebrow: "Today in the field", home: "employee-portal",
    primary: { label: "Open field mode", route: "employee-mobile-app", icon: Wrench },
    items: [
      { label: "Today’s schedule", route: "master-scheduling", icon: CalendarDays },
      { label: "Work orders", route: "work-order-management", icon: ClipboardList },
      { label: "Time & hours", route: "time-tracking", icon: WalletCards },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "vendor-portal": {
    label: "Vendor Portal", eyebrow: "Supplier operations", home: "vendor-portal",
    primary: { label: "Open opportunities", route: "bid-room", icon: Sparkles },
    items: [
      { label: "Jobs & work orders", route: "work-order-management", icon: ClipboardList },
      { label: "Invoices", route: "invoices", icon: CreditCard },
      { label: "Documents", route: "customer-documents", icon: FileText },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "subcontractor-portal": {
    label: "Subcontractor Portal", eyebrow: "Job delivery", home: "subcontractor-portal",
    primary: { label: "Review bid room", route: "bid-room", icon: Sparkles },
    items: [
      { label: "Work orders", route: "work-order-management", icon: ClipboardList },
      { label: "Schedule", route: "master-scheduling", icon: CalendarDays },
      { label: "Invoices", route: "invoices", icon: CreditCard },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "advertiser-portal": {
    label: "Advertiser Portal", eyebrow: "Campaign operations", home: "advertiser-portal",
    primary: { label: "Open content center", route: "enterprise-content-center", icon: Sparkles },
    items: [
      { label: "Campaign assets", route: "enterprise-content-center", icon: FileText },
      { label: "Performance", route: "reports", icon: ClipboardList },
      { label: "Invoices", route: "payment-center", icon: CreditCard },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "investor-portal": {
    label: "Investor Portal", eyebrow: "Portfolio overview", home: "investor-portal",
    primary: { label: "Review opportunities", route: "investment-opportunities", icon: Sparkles },
    items: [
      { label: "Investment management", route: "investment-management", icon: ClipboardList },
      { label: "Documents", route: "customer-documents", icon: FileText },
      { label: "Payments", route: "payment-center", icon: CreditCard },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "property-manager-portal": {
    label: "Property Manager", eyebrow: "Portfolio operations", home: "property-manager-portal",
    primary: { label: "Open work requests", route: "work-request-hub", icon: Wrench },
    items: [
      { label: "Properties", route: "property-management-hub", icon: ClipboardList },
      { label: "Schedule", route: "master-scheduling", icon: CalendarDays },
      { label: "Financials", route: "payment-center", icon: CreditCard },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "condo-manager-portal": {
    label: "Condo Manager", eyebrow: "Association operations", home: "condo-manager-portal",
    primary: { label: "Open work requests", route: "work-request-hub", icon: Wrench },
    items: [
      { label: "Properties", route: "property-management-hub", icon: ClipboardList },
      { label: "Schedule", route: "master-scheduling", icon: CalendarDays },
      { label: "Financials", route: "payment-center", icon: CreditCard },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "landlord-portal": {
    label: "Landlord Portal", eyebrow: "Unit performance", home: "landlord-portal",
    primary: { label: "Submit work request", route: "request-service", icon: Wrench },
    items: [
      { label: "Properties", route: "property-management-hub", icon: ClipboardList },
      { label: "Plans & turns", route: "maintenance-plans", icon: ShieldCheck },
      { label: "Financials", route: "payment-center", icon: CreditCard },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "tenant-portal": {
    label: "Resident Portal", eyebrow: "Your unit", home: "tenant-portal",
    primary: { label: "Request maintenance", route: "tenant-portal", icon: Wrench },
    items: [
      { label: "Rewards & referrals", route: "loyalty", icon: Sparkles },
      { label: "Gift cards", route: "gift-cards", icon: CreditCard },
      { label: "Online shop", route: "public-store", icon: ShoppingBag },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "admin-portal": {
    label: "Admin Portal", eyebrow: "Operations control", home: "admin-portal",
    primary: { label: "Open Command Center", route: "unified-dashboard", icon: Crown },
    items: [
      { label: "Alerts & requests", route: "admin-alerts", icon: Bell },
      { label: "Team & users", route: "user-management-hub", icon: Users },
      { label: "Pipeline", route: "unified-project-pipeline", icon: ClipboardList },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
  "unified-dashboard": {
    label: "Command Center", eyebrow: "Platform oversight", home: "unified-dashboard",
    primary: { label: "Owner dashboard", route: "owners-dashboard", icon: Crown },
    items: [
      { label: "Alerts & requests", route: "admin-alerts", icon: Bell },
      { label: "CRM & pipeline", route: "unified-crm", icon: Users },
      { label: "Financial controls", route: "payment-center", icon: CreditCard },
      { label: "More operations", route: "owners-dashboard", icon: LayoutDashboard },
    ],
  },
  "owners-dashboard": {
    label: "Owner Dashboard", eyebrow: "Platform oversight", home: "owners-dashboard",
    primary: { label: "Open Command Center", route: "unified-dashboard", icon: Crown },
    items: [
      { label: "Alerts & requests", route: "admin-alerts", icon: Bell },
      { label: "Users & portals", route: "user-management-hub", icon: Users },
      { label: "Financial controls", route: "payment-center", icon: CreditCard },
      { label: "More operations", route: "unified-dashboard", icon: LayoutDashboard },
    ],
  },
  "owner-dashboard": {
    label: "Owner Dashboard", eyebrow: "Platform oversight", home: "owners-dashboard",
    primary: { label: "Open Command Center", route: "unified-dashboard", icon: Crown },
    items: [
      { label: "Alerts & requests", route: "admin-alerts", icon: Bell },
      { label: "Users & portals", route: "user-management-hub", icon: Users },
      { label: "Financial controls", route: "payment-center", icon: CreditCard },
      { label: "More operations", route: "unified-dashboard", icon: LayoutDashboard },
    ],
  },
  "territory-portal": {
    label: "Territory Portal", eyebrow: "Local market control", home: "territory-portal",
    primary: { label: "View pipeline", route: "unified-project-pipeline", icon: Sparkles },
    items: [
      { label: "Leads", route: "unified-crm", icon: ClipboardList },
      { label: "Schedule", route: "master-scheduling", icon: CalendarDays },
      { label: "Financials", route: "payment-center", icon: CreditCard },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ],
  },
};

export default function MobilePortalShell({ page, navigate }: MobilePortalShellProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const portal = PORTALS[page];

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const navItems = useMemo(() => {
    if (!portal) return [];
    return [
      { label: "Home", route: portal.home, icon: Home },
      { label: "Action", route: portal.primary.route, icon: portal.primary.icon },
      { label: "Messages", route: "messages", icon: MessageCircle },
    ];
  }, [portal]);

  if (!isMobile || !portal) return null;

  const go = (route: string) => {
    setMenuOpen(false);
    navigate(route);
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] h-28 bg-gradient-to-t from-[#090909] via-[#090909]/90 to-transparent" />
      {menuOpen && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${portal.label} quick actions`}>
          <button aria-label="Close quick actions" className="absolute inset-0" onClick={() => setMenuOpen(false)} />
          <section className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#171717] shadow-2xl shadow-black/70">
            <div className="flex items-start justify-between border-b border-white/10 px-5 pb-4 pt-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">{portal.eyebrow}</p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.01em] text-white">Quick actions</h2>
              </div>
              <button onClick={() => setMenuOpen(false)} className="rounded-full border border-white/10 p-2 text-zinc-300" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-2 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {[portal.primary, ...portal.items].map((item) => {
                const Icon = item.icon;
                return <button key={`${item.route}-${item.label}`} onClick={() => go(item.route)} className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/8 bg-[#202020] px-4 text-left transition active:scale-[0.98] active:bg-[#292929]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-orange-300"><Icon className="h-4 w-4" /></span>
                  <span className="flex-1 text-sm font-medium text-zinc-100">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </button>;
              })}
            </div>
          </section>
        </div>
      )}
      <nav className="fixed inset-x-3 bottom-[max(0.65rem,env(safe-area-inset-bottom))] z-[75] flex h-[66px] items-center justify-around rounded-[22px] border border-white/10 bg-[#161616]/95 px-1 shadow-2xl shadow-black/70 backdrop-blur-xl" aria-label={`${portal.label} mobile navigation`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = page === item.route;
          return <button key={item.label} onClick={() => go(item.route)} className={`flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-semibold ${active ? "text-orange-300" : "text-zinc-400"}`}>
            <Icon className="h-[19px] w-[19px]" />
            <span>{item.label}</span>
          </button>;
        })}
        <button onClick={() => setMenuOpen(true)} className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-semibold text-zinc-400">
          <MoreHorizontal className="h-[19px] w-[19px]" /><span>More</span>
        </button>
      </nav>
    </>
  );
}
