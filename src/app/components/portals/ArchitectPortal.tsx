import { useState } from 'react';
import SponsoredMarquee from '../SponsoredMarquee';
import { Ruler, FileText, Calendar, TrendingUp, Users, Home } from 'lucide-react';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';

export default function ArchitectPortal() {
  const [activeTab, setActiveTab] = useState<'dashboard'>('dashboard');

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Logo Marquee */}
      <LogoMarquee speed={30} />

      {/* Advertising Text Banner */}
      <AdvertisingMarquee placement="architect-portal" dismissible />

      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ea580c] to-orange-600 rounded-lg flex items-center justify-center">
                <Ruler className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Architect Portal</h1>
                <p className="text-xs text-gray-400">Design & Planning</p>
              </div>
            </div>
          </div>

          <nav className="flex gap-1 -mb-px">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-[#ea580c] text-[#ea580c]'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-[#ea580c] to-orange-600 rounded-xl p-8 text-white text-center">
          <Ruler className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Architect Portal</h2>
          <p className="text-white/90">Design and planning management portal coming soon</p>
        </div>
      </main>
    </div>
  );
}
