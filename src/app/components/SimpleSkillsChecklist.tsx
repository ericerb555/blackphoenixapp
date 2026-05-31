/**
 * Simple Skills Checklist Component
 * 
 * Simplified interface for selecting employee skills:
 * - Check boxes for skills they have
 * - Star rating for quality (1-5)
 * - Organized by category
 * - Quick and easy to use
 */

import { useState } from 'react';
import { Star, CheckCircle, Award, Settings } from 'lucide-react';

interface SkillRating {
  skillName: string;
  category: string;
  qualityRating: number;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience: number;
  certified: boolean;
}

interface SimpleSkillsChecklistProps {
  availableSkills: { name: string; category: string; icon?: any }[];
  selectedSkills: SkillRating[];
  onChange: (skills: SkillRating[]) => void;
  onEditSkills: () => void;
}

export default function SimpleSkillsChecklist({ 
  availableSkills, 
  selectedSkills, 
  onChange,
  onEditSkills 
}: SimpleSkillsChecklistProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState('all');

  // Get unique categories
  const categories = Array.from(new Set(availableSkills.map(s => s.category)));

  const toggleCategory = (category: string) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter(c => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };

  const isSkillSelected = (skillName: string) => {
    return selectedSkills.some(s => s.skillName === skillName);
  };

  const getSkillRating = (skillName: string) => {
    return selectedSkills.find(s => s.skillName === skillName);
  };

  const handleToggleSkill = (skillName: string, category: string) => {
    if (isSkillSelected(skillName)) {
      // Remove skill
      onChange(selectedSkills.filter(s => s.skillName !== skillName));
    } else {
      // Add skill with default values
      const newSkill: SkillRating = {
        skillName,
        category,
        qualityRating: 3,
        proficiencyLevel: 'intermediate',
        yearsExperience: 1,
        certified: false
      };
      onChange([...selectedSkills, newSkill]);
    }
  };

  const handleUpdateQuality = (skillName: string, rating: number) => {
    onChange(selectedSkills.map(skill => 
      skill.skillName === skillName ? { ...skill, qualityRating: rating } : skill
    ));
  };

  const handleUpdateProficiency = (skillName: string, level: 'beginner' | 'intermediate' | 'advanced' | 'expert') => {
    onChange(selectedSkills.map(skill => 
      skill.skillName === skillName ? { ...skill, proficiencyLevel: level } : skill
    ));
  };

  const handleUpdateYears = (skillName: string, years: number) => {
    onChange(selectedSkills.map(skill => 
      skill.skillName === skillName ? { ...skill, yearsExperience: years } : skill
    ));
  };

  const handleToggleCertified = (skillName: string) => {
    onChange(selectedSkills.map(skill => 
      skill.skillName === skillName ? { ...skill, certified: !skill.certified } : skill
    ));
  };

  const getQualityLabel = (rating: number) => {
    switch (rating) {
      case 1: return 'NEEDS WORK';
      case 2: return 'FAIR';
      case 3: return 'AVERAGE';
      case 4: return 'GOOD';
      case 5: return 'EXCELLENT';
      default: return '';
    }
  };

  const getQualityColor = (rating: number) => {
    switch (rating) {
      case 1: return 'text-red-400';
      case 2: return 'text-yellow-400';
      case 3: return 'text-blue-400';
      case 4: return 'text-green-400';
      case 5: return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getProficiencyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
      case 'intermediate': return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
      case 'advanced': return 'bg-purple-600/20 text-purple-400 border-purple-500/30';
      case 'expert': return 'bg-orange-600/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredCategories = filterCategory === 'all' 
    ? categories 
    : categories.filter(cat => cat === filterCategory);

  return (
    <div className="space-y-4">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Select Skills & Rate Quality</h3>
          <p className="text-sm text-gray-400">Check skills and rate work quality (1-5 stars)</p>
        </div>
        <button
          onClick={onEditSkills}
          className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition font-medium flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Edit Skills List
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            filterCategory === 'all'
              ? 'bg-orange-600 text-white'
              : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A]'
          }`}
        >
          All Categories
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterCategory === cat
                ? 'bg-orange-600 text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Selected Skills Summary */}
      {selectedSkills.length > 0 && (
        <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">{selectedSkills.length} Skills Selected</span>
          </div>
        </div>
      )}

      {/* Skills by Category */}
      <div className="space-y-4">
        {filteredCategories.map(category => {
          const categorySkills = availableSkills.filter(s => s.category === category);
          const selectedInCategory = selectedSkills.filter(s => s.category === category).length;
          
          return (
            <div key={category} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition"
              >
                <div className="flex items-center gap-3">
                  <h4 className="text-white font-semibold">{category}</h4>
                  <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded text-xs font-bold">
                    {categorySkills.length} skills
                  </span>
                  {selectedInCategory > 0 && (
                    <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-bold">
                      {selectedInCategory} selected
                    </span>
                  )}
                </div>
                <div className="text-gray-400">
                  {expandedCategories.includes(category) ? '▼' : '▶'}
                </div>
              </button>

              {/* Skills List */}
              {expandedCategories.includes(category) && (
                <div className="p-4 pt-0 space-y-3">
                  {categorySkills.map(skill => {
                    const isSelected = isSkillSelected(skill.name);
                    const skillRating = getSkillRating(skill.name);

                    return (
                      <div
                        key={skill.name}
                        className={`rounded-xl border transition ${
                          isSelected 
                            ? 'bg-orange-600/10 border-orange-500/30' 
                            : 'bg-[#0A0A0A] border-[#2A2A2A]'
                        }`}
                      >
                        {/* Skill Header - Checkbox */}
                        <div className="p-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSkill(skill.name, skill.category)}
                              className="w-5 h-5 rounded bg-[#0A0A0A] border-[#2A2A2A] text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                            <span className="text-white font-medium flex-1">{skill.name}</span>
                            {skillRating?.certified && (
                              <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-bold border border-green-500/30 flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                CERTIFIED
                              </span>
                            )}
                          </label>
                        </div>

                        {/* Skill Details - Only show when selected */}
                        {isSelected && skillRating && (
                          <div className="px-4 pb-4 space-y-4 border-t border-orange-500/20">
                            {/* Quality Rating */}
                            <div>
                              <label className="text-sm text-gray-400 mb-2 block font-medium">
                                Quality Rating
                              </label>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map(rating => (
                                    <button
                                      key={rating}
                                      onClick={() => handleUpdateQuality(skill.name, rating)}
                                      className="transition hover:scale-110"
                                    >
                                      <Star
                                        className={`w-8 h-8 ${
                                          rating <= skillRating.qualityRating
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-600 hover:text-yellow-400'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-bold text-lg">
                                    {skillRating.qualityRating}/5
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${getQualityColor(skillRating.qualityRating)}`}>
                                    {getQualityLabel(skillRating.qualityRating)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Proficiency & Years */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-gray-400 mb-2 block font-medium">
                                  Proficiency Level
                                </label>
                                <select
                                  value={skillRating.proficiencyLevel}
                                  onChange={(e) => handleUpdateProficiency(skill.name, e.target.value as any)}
                                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                                >
                                  <option value="beginner">Beginner</option>
                                  <option value="intermediate">Intermediate</option>
                                  <option value="advanced">Advanced</option>
                                  <option value="expert">Expert</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-sm text-gray-400 mb-2 block font-medium">
                                  Years Experience
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  value={skillRating.yearsExperience}
                                  onChange={(e) => handleUpdateYears(skill.name, parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                                />
                              </div>
                            </div>

                            {/* Certified Checkbox */}
                            <div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={skillRating.certified}
                                  onChange={() => handleToggleCertified(skill.name)}
                                  className="w-4 h-4 rounded bg-[#0A0A0A] border-[#2A2A2A] text-green-600 focus:ring-green-500 cursor-pointer"
                                />
                                <span className="text-white text-sm">Certified in this skill</span>
                                {skillRating.certified && <Award className="w-4 h-4 text-green-400" />}
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Expand/Collapse All */}
      <div className="flex gap-2">
        <button
          onClick={() => setExpandedCategories(categories)}
          className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition text-sm font-medium"
        >
          Expand All
        </button>
        <button
          onClick={() => setExpandedCategories([])}
          className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition text-sm font-medium"
        >
          Collapse All
        </button>
      </div>
    </div>
  );
}
