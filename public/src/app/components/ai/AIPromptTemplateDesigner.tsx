import { useState, useEffect } from 'react';
import {
  Sparkles, Plus, Save, Trash2, Copy, Play, Code, FileText,
  Settings, ChevronDown, ChevronRight, Edit3, Check, X, Eye,
  Loader, RefreshCw, Zap, BookOpen, Variable, Braces
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TextArea } from '../ui/input/TextArea';
import { ConfirmModal } from '../ui/modal';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';
import { IconButton } from '../ui/button/IconButton';

interface PromptTemplate {
  id: string;
  template_name: string;
  template_type: string;
  category: string;
  base_prompt: string;
  system_context: string;
  style_modifiers: Record<string, string>;
  room_prompts: Record<string, string>;
  dimension_prompts: Record<string, string>;
  output_format: Record<string, unknown>;
  variables: Array<{
    name: string;
    type: string;
    options?: string[];
    min?: number;
    max?: number;
  }>;
  is_active: boolean;
  version: number;
  created_at: string;
}

const TEMPLATE_TYPES = [
  { id: 'floor_plan', name: 'Floor Plan', icon: '📐' },
  { id: 'kitchen', name: 'Kitchen Layout', icon: '🍳' },
  { id: 'structural', name: 'Structural Plan', icon: '🏗️' },
  { id: 'rendering', name: 'Rendering', icon: '🎨' },
  { id: 'wireframe', name: 'UI Wireframe', icon: '📱' },
];

const VARIABLE_TYPES = ['text', 'number', 'select', 'multiselect', 'array', 'boolean'];

export default function AIPromptTemplateDesigner() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    base: true,
    variables: true,
    modifiers: false,
    output: false,
  });
  const [editMode, setEditMode] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<Partial<PromptTemplate>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_prompt_templates')
        .select('*')
        .order('template_type', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
      if (data && data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const updateData = editMode ? { ...editedTemplate, updated_at: new Date().toISOString() } : selectedTemplate;
      const { error } = await supabase
        .from('ai_prompt_templates')
        .update(updateData)
        .eq('id', selectedTemplate.id);

      if (error) throw error;
      setEditMode(false);
      await fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const newTemplate: Partial<PromptTemplate> = {
      template_name: 'New Template',
      template_type: 'floor_plan',
      category: 'general',
      base_prompt: 'Enter your base prompt here with {{variables}}',
      system_context: 'You are an expert architect...',
      style_modifiers: {},
      room_prompts: {},
      dimension_prompts: {},
      output_format: {},
      variables: [],
      is_active: true,
      version: 1,
    };

    try {
      const { data, error } = await supabase
        .from('ai_prompt_templates')
        .insert(newTemplate)
        .select()
        .single();

      if (error) throw error;
      await fetchTemplates();
      setSelectedTemplate(data);
      setEditMode(true);
      setEditedTemplate(data);
    } catch (err) {
      console.error('Error creating template:', err);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplate) return;
    const duplicate: Partial<PromptTemplate> = {
      ...selectedTemplate,
      template_name: `${selectedTemplate.template_name} (Copy)`,
      version: 1,
    };
    delete (duplicate as { id?: string }).id;

    try {
      const { data, error } = await supabase
        .from('ai_prompt_templates')
        .insert(duplicate)
        .select()
        .single();

      if (error) throw error;
      await fetchTemplates();
      setSelectedTemplate(data);
    } catch (err) {
      console.error('Error duplicating template:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    try {
      await supabase.from('ai_prompt_templates').delete().eq('id', selectedTemplate.id);
      setSelectedTemplate(null);
      await fetchTemplates();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const handleTest = async () => {
    if (!selectedTemplate) return;
    setTesting(true);
    setTestOutput('');
    try {
      let expandedPrompt = selectedTemplate.base_prompt;
      selectedTemplate.variables.forEach((v) => {
        const placeholder = `{{${v.name}}}`;
        let value = v.type === 'select' && v.options ? v.options[0] : `[${v.name}]`;
        if (v.type === 'number') value = String(v.min || 0);
        expandedPrompt = expandedPrompt.replace(new RegExp(placeholder, 'g'), value);
      });

      setTestOutput(`System Context:\n${selectedTemplate.system_context}\n\n---\n\nExpanded Prompt:\n${expandedPrompt}\n\n---\n\nOutput Format:\n${JSON.stringify(selectedTemplate.output_format, null, 2)}`);
    } catch (err) {
      setTestOutput('Error testing template');
    } finally {
      setTesting(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const addVariable = () => {
    const current = editMode ? editedTemplate : selectedTemplate;
    if (!current) return;
    const newVar = { name: 'new_variable', type: 'text' };
    const updated = { ...current, variables: [...(current.variables || []), newVar] };
    if (editMode) {
      setEditedTemplate(updated);
    } else {
      setSelectedTemplate(updated as PromptTemplate);
    }
  };

  const updateVariable = (index: number, field: string, value: unknown) => {
    const current = editMode ? editedTemplate : selectedTemplate;
    if (!current?.variables) return;
    const vars = [...current.variables];
    vars[index] = { ...vars[index], [field]: value };
    if (editMode) {
      setEditedTemplate({ ...current, variables: vars });
    } else {
      setSelectedTemplate({ ...current, variables: vars } as PromptTemplate);
    }
  };

  const removeVariable = (index: number) => {
    const current = editMode ? editedTemplate : selectedTemplate;
    if (!current?.variables) return;
    const vars = current.variables.filter((_, i) => i !== index);
    if (editMode) {
      setEditedTemplate({ ...current, variables: vars });
    } else {
      setSelectedTemplate({ ...current, variables: vars } as PromptTemplate);
    }
  };

  const currentData = editMode ? editedTemplate : selectedTemplate;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">AI Prompt Templates</h3>
          <p className="text-sm text-slate-500">Design and manage prompts for AI-generated architectural outputs</p>
        </div>
        <PrimaryButton
          onClick={handleCreate}
          icon={<Plus />}
          iconPosition="left"
        >
          New Template
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h4 className="font-semibold text-slate-900">Templates</h4>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setEditMode(false);
                    setTestOutput('');
                  }}
                  className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{TEMPLATE_TYPES.find((t) => t.id === template.template_type)?.icon || '📄'}</span>
                    <span className="font-medium text-slate-900 text-sm truncate">{template.template_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 capitalize">{template.template_type.replace('_', ' ')}</span>
                    <span className={`w-2 h-2 rounded-full ${template.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                </button>
              ))}
              {templates.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-sm">No templates yet</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {currentData ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editMode ? (
                    <input
                      type="text"
                      value={editedTemplate.template_name || ''}
                      onChange={(e) => setEditedTemplate({ ...editedTemplate, template_name: e.target.value })}
                      className="font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1"
                    />
                  ) : (
                    <h4 className="font-semibold text-slate-900">{currentData.template_name}</h4>
                  )}
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    v{currentData.version}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <>
                      <IconButton
                        icon={<X />}
                        onClick={() => {
                          setEditMode(false);
                          setEditedTemplate({});
                        }}
                        variant="ghost"
                        tooltip="Cancel"
                        size="sm"
                      />
                      <PrimaryButton
                        onClick={handleSave}
                        loading={saving}
                        icon={<Check />}
                        iconPosition="left"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Save
                      </PrimaryButton>
                    </>
                  ) : (
                    <>
                      <IconButton
                        icon={<Edit3 />}
                        onClick={() => { setEditMode(true); setEditedTemplate(selectedTemplate!); }}
                        variant="ghost"
                        tooltip="Edit"
                      />
                      <IconButton
                        icon={<Copy />}
                        onClick={handleDuplicate}
                        variant="ghost"
                        tooltip="Duplicate"
                      />
                      <IconButton
                        icon={<Play />}
                        onClick={handleTest}
                        disabled={testing}
                        loading={testing}
                        variant="ghost"
                        tooltip="Test Template"
                        className="hover:bg-blue-50"
                      />
                      <IconButton
                        icon={<Trash2 />}
                        onClick={() => setShowDeleteConfirm(true)}
                        variant="ghost"
                        tooltip="Delete"
                        className="hover:bg-red-50 text-red-500"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Template Type</label>
                    {editMode ? (
                      <select
                        value={editedTemplate.template_type || ''}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, template_type: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        {TEMPLATE_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-700">
                        {TEMPLATE_TYPES.find((t) => t.id === currentData.template_type)?.name}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedTemplate.category || ''}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, category: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-700 capitalize">{currentData.category}</div>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('base')}
                    className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-slate-900">Base Prompt</span>
                    </div>
                    {expandedSections.base ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.base && (
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">System Context</label>
                        {editMode ? (
                          <TextArea
                            value={editedTemplate.system_context || ''}
                            onChange={(value) => setEditedTemplate({ ...editedTemplate, system_context: value })}
                            className="font-mono text-sm"
                            rows={3}
                          />
                        ) : (
                          <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-700 text-sm whitespace-pre-wrap">
                            {currentData.system_context}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Prompt Template</label>
                        {editMode ? (
                          <TextArea
                            value={editedTemplate.base_prompt || ''}
                            onChange={(value) => setEditedTemplate({ ...editedTemplate, base_prompt: value })}
                            className="font-mono text-sm"
                            rows={6}
                            placeholder="Use {{variable_name}} for dynamic values"
                          />
                        ) : (
                          <div className="px-3 py-2 bg-slate-900 rounded-lg text-emerald-400 text-sm font-mono whitespace-pre-wrap">
                            {currentData.base_prompt}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('variables')}
                    className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <Variable className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-slate-900">Variables</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">{currentData.variables?.length || 0}</span>
                    </div>
                    {expandedSections.variables ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.variables && (
                    <div className="p-4 space-y-3">
                      {(currentData.variables || []).map((variable, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <code className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-mono">
                            {`{{${variable.name}}}`}
                          </code>
                          {editMode ? (
                            <>
                              <input
                                type="text"
                                value={variable.name}
                                onChange={(e) => updateVariable(index, 'name', e.target.value)}
                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Variable name"
                              />
                              <select
                                value={variable.type}
                                onChange={(e) => updateVariable(index, 'type', e.target.value)}
                                className="px-2 py-1 border border-slate-300 rounded text-sm"
                              >
                                {VARIABLE_TYPES.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <IconButton
                                icon={<X />}
                                onClick={() => removeVariable(index)}
                                variant="ghost"
                                size="sm"
                                tooltip="Remove"
                                className="hover:bg-red-100 text-red-500"
                              />
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm text-slate-600">{variable.name}</span>
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs">{variable.type}</span>
                              {variable.options && (
                                <span className="text-xs text-slate-500">{variable.options.length} options</span>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      {editMode && (
                        <button
                          onClick={addVariable}
                          className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4 inline mr-1" /> Add Variable
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('modifiers')}
                    className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-600" />
                      <span className="font-medium text-slate-900">Style Modifiers</span>
                    </div>
                    {expandedSections.modifiers ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.modifiers && (
                    <div className="p-4">
                      <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(currentData.style_modifiers, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('output')}
                    className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <Braces className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-slate-900">Output Format</span>
                    </div>
                    {expandedSections.output ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.output && (
                    <div className="p-4">
                      <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(currentData.output_format, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {testOutput && (
                  <div className="border border-blue-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-blue-50 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900 text-sm">Test Output Preview</span>
                    </div>
                    <pre className="p-4 bg-slate-900 text-green-400 text-xs overflow-x-auto whitespace-pre-wrap">
                      {testOutput}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Template</h3>
              <p className="text-slate-600 mb-4">Choose a template from the list or create a new one</p>
              <PrimaryButton
                onClick={handleCreate}
                icon={<Plus />}
                iconPosition="left"
              >
                Create Template
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={`Are you sure you want to delete "${selectedTemplate?.template_name}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
