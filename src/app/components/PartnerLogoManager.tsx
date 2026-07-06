/**
 * Partner Logo Manager
 * Manages the logos displayed in the LogoMarquee component
 * Syncs with localStorage 'partnerLogos'
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Edit, Save, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PartnerLogo {
  id: string;
  name: string;
  imageUrl: string;
  linkUrl?: string;
}

export default function PartnerLogoManager() {
  const [logos, setLogos] = useState<PartnerLogo[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PartnerLogo | null>(null);

  useEffect(() => {
    loadLogos();
  }, []);

  const loadLogos = () => {
    try {
      const saved = localStorage.getItem('partnerLogos');
      if (saved) {
        setLogos(JSON.parse(saved));
      } else {
        // Set default partner logos
        const defaultLogos: PartnerLogo[] = [
          { id: '1', name: 'DeWalt', imageUrl: 'https://images.unsplash.com/photo-1588783948922-0c6e1c6a7c9c?w=200&h=80&fit=crop' },
          { id: '2', name: 'Milwaukee', imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=80&fit=crop' },
          { id: '3', name: 'Makita', imageUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=200&h=80&fit=crop' },
          { id: '4', name: 'Bosch', imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=200&h=80&fit=crop' },
          { id: '5', name: 'Stanley', imageUrl: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=200&h=80&fit=crop' },
        ];
        setLogos(defaultLogos);
        saveLogos(defaultLogos);
      }
    } catch (error) {
      console.error('Error loading partner logos:', error);
      toast.error('Failed to load partner logos');
    }
  };

  const saveLogos = (updatedLogos: PartnerLogo[]) => {
    try {
      localStorage.setItem('partnerLogos', JSON.stringify(updatedLogos));
      setLogos(updatedLogos);

      // Dispatch custom event to notify LogoMarquee components
      window.dispatchEvent(new Event('partnerLogosUpdated'));

      toast.success('Partner logos updated! Marquee will refresh automatically.');
    } catch (error) {
      console.error('Error saving partner logos:', error);
      toast.error('Failed to save partner logos');
    }
  };

  const handleAddLogo = () => {
    const newLogo: PartnerLogo = {
      id: Date.now().toString(),
      name: 'New Partner',
      imageUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=200&h=80&fit=crop',
      linkUrl: ''
    };
    const updatedLogos = [...logos, newLogo];
    saveLogos(updatedLogos);
    setEditingId(newLogo.id);
    setEditForm(newLogo);
  };

  const handleEditLogo = (logo: PartnerLogo) => {
    setEditingId(logo.id);
    setEditForm({ ...logo });
  };

  const handleSaveEdit = () => {
    if (!editForm || !editingId) return;

    const updatedLogos = logos.map(logo =>
      logo.id === editingId ? editForm : logo
    );
    saveLogos(updatedLogos);
    setEditingId(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleDeleteLogo = (id: string) => {
    const updatedLogos = logos.filter(logo => logo.id !== id);
    saveLogos(updatedLogos);
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#ea580c]" />
            Partner Logo Marquee
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Manage the logos that scroll across your landing page
          </p>
        </div>
        <button
          onClick={handleAddLogo}
          className="px-4 py-2 bg-[#ea580c] hover:bg-orange-600 text-white rounded-lg font-semibold transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Logo
        </button>
      </div>

      {/* Logo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {logos.map((logo) => (
          <div
            key={logo.id}
            className={`bg-[#0A0A0A] border rounded-xl p-4 transition ${
              editingId === logo.id ? 'border-[#ea580c]' : 'border-zinc-800'
            }`}
          >
            {editingId === logo.id && editForm ? (
              // Edit Mode
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Logo Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Image URL</label>
                  <input
                    type="text"
                    value={editForm.imageUrl}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Link URL (Optional)</label>
                  <input
                    type="text"
                    value={editForm.linkUrl || ''}
                    onChange={(e) => setEditForm({ ...editForm, linkUrl: e.target.value })}
                    placeholder="https://partner-website.com"
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                  />
                </div>

                {/* Preview */}
                <div className="h-20 bg-[#1A1A1A] border border-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                  {editForm.imageUrl ? (
                    <img
                      src={editForm.imageUrl}
                      alt={editForm.name}
                      className="max-w-full max-h-full object-contain opacity-60 filter grayscale"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-zinc-600" />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="space-y-3">
                <div className="h-20 bg-[#1A1A1A] border border-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                  {logo.imageUrl ? (
                    <img
                      src={logo.imageUrl}
                      alt={logo.name}
                      className="max-w-full max-h-full object-contain opacity-60 filter grayscale"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-zinc-600" />
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-white text-sm">{logo.name}</h4>
                  {logo.linkUrl && (
                    <p className="text-xs text-zinc-500 truncate">{logo.linkUrl}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditLogo(logo)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteLogo(logo.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {logos.length === 0 && (
          <div className="col-span-full text-center py-12">
            <ImageIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 mb-4">No partner logos yet</p>
            <button
              onClick={handleAddLogo}
              className="px-4 py-2 bg-[#ea580c] hover:bg-orange-600 text-white rounded-lg font-semibold transition"
            >
              Add Your First Logo
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          💡 <strong>Tip:</strong> These logos will automatically appear in the scrolling marquee on your landing page.
          Use transparent PNG images (200x80px recommended) for best results.
        </p>
      </div>
    </div>
  );
}
