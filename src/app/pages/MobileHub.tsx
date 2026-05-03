/**
 * Mobile Hub - Portal Control Panel Page
 * 
 * Full-page wrapper for the MobileHubControlPanel component
 * Provides enterprise portal management and configuration interface
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Settings } from 'lucide-react';
import MobileHubControlPanel from '../components/MobileHubControlPanel';

export default function MobileHub() {
  const [showPanel, setShowPanel] = useState(true);

  // Parse URL parameters to determine initial view
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    
    // If there's a view parameter, ensure panel is open
    if (view) {
      setShowPanel(true);
    }
  }, []);

  const handleClose = () => {
    // Navigate back to dashboard instead of just closing
    window.location.href = '/unified-dashboard';
  };

  const navigateToDashboard = () => {
    window.location.href = '/unified-dashboard';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#0F0F0F] border-b border-[#2A2A2A] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={navigateToDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:border-orange-500/50 hover:bg-[#1A1A1A]/80 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              Mobile Hub - Portal Control
            </h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-600/20 border border-orange-500/50 rounded-lg">
            <Settings className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-orange-300">ADMIN MODE</span>
          </div>
        </div>
      </div>

      {/* Main Content - Control Panel */}
      <div className="p-6">
        {showPanel ? (
          <MobileHubControlPanel 
            isOpen={showPanel} 
            onClose={handleClose}
            userRole="admin"
          />
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="p-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-center">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Portal Control Panel</h2>
              <p className="text-gray-400 mb-6">Manage your enterprise portals and mobile applications</p>
              <button
                onClick={() => setShowPanel(true)}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
              >
                Open Control Panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
