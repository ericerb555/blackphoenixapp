import { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Image as ImageIcon, DollarSign, Info } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { DIRECTORY_SECTIONS, DirectorySection } from '../config/directoryLandingSections';

interface DirectorySectionsEditorProps {
  onSave?: () => void;
}

export default function DirectorySectionsEditor({ onSave }: DirectorySectionsEditorProps) {
  const [sections, setSections] = useState<DirectorySection[]>([...DIRECTORY_SECTIONS]);
  const [selectedSection, setSelectedSection] = useState<DirectorySection | null>(null);
  const [editingSection, setEditingSection] = useState<DirectorySection | null>(null);

  const handleEditSection = (section: DirectorySection) => {
    setEditingSection({ ...section });
    setSelectedSection(section);
  };

  const handleUpdateField = (field: keyof DirectorySection, value: any) => {
    if (!editingSection) return;
    setEditingSection({
      ...editingSection,
      [field]: value
    });
  };

  const handleUpdateBenefit = (index: number, value: string) => {
    if (!editingSection) return;
    const newBenefits = [...editingSection.benefits];
    newBenefits[index] = value;
    setEditingSection({
      ...editingSection,
      benefits: newBenefits
    });
  };

  const handleAddBenefit = () => {
    if (!editingSection) return;
    setEditingSection({
      ...editingSection,
      benefits: [...editingSection.benefits, 'New Benefit']
    });
  };

  const handleRemoveBenefit = (index: number) => {
    if (!editingSection) return;
    const newBenefits = editingSection.benefits.filter((_, i) => i !== index);
    setEditingSection({
      ...editingSection,
      benefits: newBenefits
    });
  };

  const handleUpdateSubscriptionPlan = (index: number, field: string, value: string) => {
    if (!editingSection || !editingSection.subscriptionPlans) return;
    const newPlans = [...editingSection.subscriptionPlans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setEditingSection({
      ...editingSection,
      subscriptionPlans: newPlans
    });
  };

  const handleSaveSection = () => {
    if (!editingSection) return;

    const updatedSections = sections.map(s =>
      s.id === editingSection.id ? editingSection : s
    );

    setSections(updatedSections);

    // Save to localStorage as a temporary solution
    // In production, this would update the actual config file
    localStorage.setItem('directory_sections_override', JSON.stringify(updatedSections));

    toast.success('Section updated successfully!');
    setEditingSection(null);
    setSelectedSection(null);

    if (onSave) {
      onSave();
    }
  };

  const handleCancel = () => {
    setEditingSection(null);
    setSelectedSection(null);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Sections List */}
      <div className="w-1/3 bg-[#1A1A1A] rounded-xl p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Directory Sections</h2>
        <p className="text-gray-400 text-sm mb-6">
          Edit the business sections that appear on the Directory Landing Page
        </p>

        <div className="space-y-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleEditSection(section)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedSection?.id === section.id
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-[#2A2A2A] hover:border-[#3A3A3A] bg-[#0A0A0A]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${section.gradient} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold">{section.id}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{section.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{section.subtitle}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Section Editor */}
      <div className="flex-1 bg-[#1A1A1A] rounded-xl p-6 overflow-y-auto">
        {!editingSection ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Info className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No Section Selected</h3>
              <p className="text-gray-500">Select a section from the list to edit</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit Section</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSection}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                <input
                  type="text"
                  value={editingSection.title}
                  onChange={(e) => handleUpdateField('title', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Subtitle</label>
                <input
                  type="text"
                  value={editingSection.subtitle}
                  onChange={(e) => handleUpdateField('subtitle', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <textarea
                  value={editingSection.description}
                  onChange={(e) => handleUpdateField('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Image URL
                </label>
                <input
                  type="text"
                  value={editingSection.image}
                  onChange={(e) => handleUpdateField('image', e.target.value)}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="https://images.unsplash.com/..."
                />
                {editingSection.image && (
                  <img
                    src={editingSection.image}
                    alt="Preview"
                    className="mt-2 w-full h-32 object-cover rounded-lg"
                  />
                )}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-400">Benefits</label>
                <button
                  onClick={handleAddBenefit}
                  className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1 text-sm"
                >
                  <Plus className="w-3 h-3" />
                  Add Benefit
                </button>
              </div>
              <div className="space-y-2">
                {editingSection.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => handleUpdateBenefit(index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={() => handleRemoveBenefit(index)}
                      className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription Plans */}
            {editingSection.subscriptionPlans && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Subscription Plans
                </label>
                <div className="space-y-4">
                  {editingSection.subscriptionPlans.map((plan, index) => (
                    <div key={index} className="p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Plan Name</label>
                          <input
                            type="text"
                            value={plan.name}
                            onChange={(e) => handleUpdateSubscriptionPlan(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Hours/Month</label>
                          <input
                            type="text"
                            value={plan.hours}
                            onChange={(e) => handleUpdateSubscriptionPlan(index, 'hours', e.target.value)}
                            className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Price</label>
                          <input
                            type="text"
                            value={plan.price}
                            onChange={(e) => handleUpdateSubscriptionPlan(index, 'price', e.target.value)}
                            className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white text-sm focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Info */}
            <div className="pt-6 border-t border-[#2A2A2A]">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Technical Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cohort Type</label>
                  <input
                    type="text"
                    value={editingSection.cohortType}
                    onChange={(e) => handleUpdateField('cohortType', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Navigate To</label>
                  <input
                    type="text"
                    value={editingSection.navigate}
                    onChange={(e) => handleUpdateField('navigate', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
