import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
}

export default function BreadcrumbNavigation({ items }: BreadcrumbNavigationProps) {
  const handleNavigation = (path?: string) => {
    if (path) {
      window.location.href = path;
    }
  };

  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 mb-4">
      <button
        onClick={() => handleNavigation('/dashboard')}
        className="hover:text-slate-900 transition-colors"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </button>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4 text-slate-400" />
          {item.path ? (
            <button
              onClick={() => handleNavigation(item.path)}
              className="hover:text-slate-900 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}