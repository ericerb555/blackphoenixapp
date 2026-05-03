/**
 * Skills Database Manager
 * 
 * Allows admins to manage the master skills list:
 * - Add custom skills
 * - Edit existing skills
 * - Delete skills
 * - Organize by category
 * - Set default categories
 */

import { useState } from 'react';
import {
  X, Plus, Edit, Trash2, Save, AlertCircle, CheckCircle,
  Wrench, Home, Droplet, Zap, PaintBucket, Hammer, Box,
  Target, Shield, Briefcase, User, Award, Folder
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Skill {
  id: string;
  name: string;
  category: string;
  icon?: string;
}

interface SkillsDatabaseManagerProps {
  onClose: () => void;
  onSave: (skills: Skill[]) => void;
  initialSkills: Skill[];
}

const ICON_OPTIONS = [
  { name: 'Wrench', icon: Wrench },
  { name: 'Home', icon: Home },
  { name: 'Droplet', icon: Droplet },
  { name: 'Zap', icon: Zap },
  { name: 'PaintBucket', icon: PaintBucket },
  { name: 'Hammer', icon: Hammer },
  { name: 'Box', icon: Box },
  { name: 'Target', icon: Target },
  { name: 'Shield', icon: Shield },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'User', icon: User },
  { name: 'Award', icon: Award }
];

const DEFAULT_CATEGORIES = [
  'Finishing',
  'Flooring',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Carpentry',
  'Exterior',
  'Masonry',
  'Specialty',
  'General',
  'Management'
];

export default function SkillsDatabaseManager({ onClose, onSave, initialSkills }: SkillsDatabaseManagerProps) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('General');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const handleAddSkill = () => {
    if (!newSkillName.trim()) {
      toast.error('Please enter a skill name');
      return;
    }

    const newSkill: Skill = {
      id: `skill_${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      icon: 'Wrench'
    };

    setSkills([...skills, newSkill]);
    setNewSkillName('');
    toast.success(`Added "${newSkill.name}"`);
  };

  const handleDeleteSkill = (id: string) => {
    const skill = skills.find(s => s.id === id);
    setSkills(skills.filter(s => s.id !== id));
    toast.success(`Removed "${skill?.name}"`);
  };

  const handleUpdateSkill = (id: string, updates: Partial<Skill>) => {
    setSkills(skills.map(skill => 
      skill.id === id ? { ...skill, ...updates } : skill
    ));
    setEditingId(null);
    toast.success('Skill updated');
  };

  const handleSave = () => {
    onSave(skills);
    toast.success(`Saved ${skills.length} skills to database`);
    onClose();
  };

  const handleAddCategory = () => {
    const categoryName = prompt('Enter new category name:');
    if (categoryName && !allCategories.includes(categoryName)) {
      setCustomCategories([...customCategories, categoryName]);
      toast.success(`Added category "${categoryName}"`);
    }
  };

  const filteredSkills = skills.filter(skill => {
    const matchesCategory = filterCategory === 'all' || skill.category === filterCategory;
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] p-6 z-10">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Folder className="w-6 h-6 text-orange-400" />
                Skills Database Manager
              </h2>
              <p className="text-sm text-gray-400">Manage and customize your skills library</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-xl transition text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <CheckCircle className="w-4 h-4" />
              <span>{skills.length} Skills</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
              <Folder className="w-4 h-4" />
              <span>{allCategories.length} Categories</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Add New Skill */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              Add New Skill
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-400 mb-2 block">Skill Name</label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="e.g., Vinyl Siding, Deck Building, Kitchen Remodeling"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Category</label>
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-orange-500"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddSkill}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Skill to Database
              </button>
              <button
                onClick={handleAddCategory}
                className="px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium"
              >
                New Category
              </button>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="Search skills..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    filterCategory === 'all'
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A]'
                  }`}
                >
                  All ({skills.length})
                </button>
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                      filterCategory === cat
                        ? 'bg-orange-600 text-white'
                        : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A]'
                    }`}
                  >
                    {cat} ({skills.filter(s => s.category === cat).length})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Skills List */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Skills Library ({filteredSkills.length})
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredSkills.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No skills found. Add some skills to get started!</p>
                </div>
              ) : (
                filteredSkills.map(skill => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition"
                  >
                    {editingId === skill.id ? (
                      <>
                        <div className="flex-1 flex gap-3">
                          <input
                            type="text"
                            defaultValue={skill.name}
                            onBlur={(e) => handleUpdateSkill(skill.id, { name: e.target.value })}
                            className="flex-1 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                            autoFocus
                          />
                          <select
                            defaultValue={skill.category}
                            onChange={(e) => handleUpdateSkill(skill.id, { category: e.target.value })}
                            className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                          >
                            {allCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 text-green-400 hover:bg-green-600/20 rounded-lg transition"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 flex-1">
                          <Wrench className="w-5 h-5 text-orange-400" />
                          <div>
                            <p className="text-white font-medium">{skill.name}</p>
                            <p className="text-xs text-gray-400">{skill.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingId(skill.id)}
                            className="p-2 text-blue-400 hover:bg-blue-600/20 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(skill.id)}
                            className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0A0A0A] border-t border-[#2A2A2A] p-6 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-medium flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Skills Database
          </button>
        </div>
      </div>
    </div>
  );
}
