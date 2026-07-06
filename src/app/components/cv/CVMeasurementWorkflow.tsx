import { useState, useEffect } from 'react';
import {
  Camera, Scan, Ruler, Settings, Play, ChevronRight, ChevronDown,
  Eye, Sliders, Target, Maximize, Grid3X3, Layers, Box, RefreshCw,
  Check, X, Plus, Trash2, Save, Loader, AlertTriangle, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NumberInput } from '../ui/input/NumberInput';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { IconButton } from '../ui/button/IconButton';

interface CVWorkflow {
  id: string;
  workflow_name: string;
  workflow_type: string;
  description: string;
  detection_config: {
    model: string;
    confidence_threshold: number;
    nms_threshold: number;
    target_classes: string[];
  };
  calibration_method: string;
  reference_objects: Array<{
    name: string;
    width_inches: number;
    height_inches: number;
  }>;
  edge_detection_params: {
    algorithm: string;
    low_threshold: number;
    high_threshold: number;
    aperture_size: number;
  };
  perspective_correction: {
    enabled: boolean;
    auto_detect_corners: boolean;
    vanishing_point_method: string;
  };
  line_detection_params: {
    algorithm: string;
    rho: number;
    theta: number;
    threshold: number;
    min_line_length: number;
    max_line_gap: number;
  };
  measurement_algorithms: {
    primary: string;
    fallback: string;
    unit: string;
    precision: number;
  };
  accuracy_thresholds: {
    excellent: number;
    good: number;
    acceptable: number;
    minimum_confidence: number;
  };
  preprocessing_steps: Array<{
    step: string;
    params: Record<string, unknown>;
  }>;
  output_config: {
    include_annotated_image: boolean;
    include_measurements_overlay: boolean;
    export_formats: string[];
  };
  is_active: boolean;
}

const WORKFLOW_TYPES = [
  { id: 'room_scan', name: 'Room Scan', description: 'Capture room dimensions from photos', icon: Box },
  { id: 'object_measure', name: 'Object Measurement', description: 'Measure specific objects', icon: Ruler },
  { id: 'floor_plan_extract', name: 'Floor Plan Extraction', description: 'Digitize existing floor plans', icon: Grid3X3 },
  { id: 'elevation_capture', name: 'Elevation Capture', description: 'Extract wall elevations', icon: Layers },
];

const CALIBRATION_METHODS = [
  { id: 'reference_object', name: 'Reference Object', description: 'Use known object for scale' },
  { id: 'known_dimension', name: 'Known Dimension', description: 'User provides a measurement' },
  { id: 'aruco_marker', name: 'ArUco Marker', description: 'Use printed marker for precision' },
  { id: 'depth_sensor', name: 'Depth Sensor', description: 'Use device depth camera' },
];

const PREPROCESSING_OPTIONS = [
  { id: 'resize', name: 'Resize', defaultParams: { max_dimension: 2048 } },
  { id: 'denoise', name: 'Denoise', defaultParams: { method: 'bilateral', d: 9 } },
  { id: 'sharpen', name: 'Sharpen', defaultParams: { kernel_size: 3 } },
  { id: 'contrast_enhance', name: 'Contrast Enhancement', defaultParams: { clip_limit: 2.0 } },
  { id: 'grayscale', name: 'Grayscale', defaultParams: {} },
  { id: 'histogram_equalize', name: 'Histogram Equalization', defaultParams: {} },
];

export default function CVMeasurementWorkflow() {
  const [workflows, setWorkflows] = useState<CVWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<CVWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    detection: true,
    calibration: true,
    preprocessing: false,
    edge: false,
    line: false,
    accuracy: false,
  });
  const [editMode, setEditMode] = useState(false);
  const [editedWorkflow, setEditedWorkflow] = useState<Partial<CVWorkflow>>({});

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('cv_measurement_workflows')
        .select('*')
        .order('workflow_name');

      if (error) throw error;
      setWorkflows(data || []);
      if (data && data.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(data[0]);
      }
    } catch (err) {
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedWorkflow) return;
    setSaving(true);
    try {
      const updateData = editMode ? editedWorkflow : selectedWorkflow;
      const { error } = await supabase
        .from('cv_measurement_workflows')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', selectedWorkflow.id);

      if (error) throw error;
      setEditMode(false);
      await fetchWorkflows();
    } catch (err) {
      console.error('Error saving workflow:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const newWorkflow: Partial<CVWorkflow> = {
      workflow_name: 'New Workflow',
      workflow_type: 'room_scan',
      description: 'New measurement workflow',
      detection_config: {
        model: 'yolov8',
        confidence_threshold: 0.7,
        nms_threshold: 0.4,
        target_classes: ['door', 'window'],
      },
      calibration_method: 'reference_object',
      reference_objects: [{ name: 'standard_door', width_inches: 36, height_inches: 80 }],
      edge_detection_params: {
        algorithm: 'canny',
        low_threshold: 50,
        high_threshold: 150,
        aperture_size: 3,
      },
      perspective_correction: {
        enabled: true,
        auto_detect_corners: true,
        vanishing_point_method: 'ransac',
      },
      line_detection_params: {
        algorithm: 'hough_probabilistic',
        rho: 1,
        theta: 0.01745,
        threshold: 50,
        min_line_length: 50,
        max_line_gap: 10,
      },
      measurement_algorithms: {
        primary: 'pixel_ratio',
        fallback: 'perspective_transform',
        unit: 'inches',
        precision: 0.5,
      },
      accuracy_thresholds: {
        excellent: 0.02,
        good: 0.05,
        acceptable: 0.10,
        minimum_confidence: 0.85,
      },
      preprocessing_steps: [
        { step: 'resize', params: { max_dimension: 2048 } },
        { step: 'denoise', params: { method: 'bilateral', d: 9 } },
      ],
      output_config: {
        include_annotated_image: true,
        include_measurements_overlay: true,
        export_formats: ['json', 'svg'],
      },
      is_active: true,
    };

    try {
      const { data, error } = await supabase
        .from('cv_measurement_workflows')
        .insert(newWorkflow)
        .select()
        .single();

      if (error) throw error;
      await fetchWorkflows();
      setSelectedWorkflow(data);
      setEditMode(true);
      setEditedWorkflow(data);
    } catch (err) {
      console.error('Error creating workflow:', err);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateConfig = (path: string, value: unknown) => {
    if (!editMode) return;
    const parts = path.split('.');
    const updated = { ...editedWorkflow };
    let current: Record<string, unknown> = updated as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
    setEditedWorkflow(updated);
  };

  const currentData = editMode ? editedWorkflow : selectedWorkflow;

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
          <h3 className="text-lg font-semibold text-slate-900">Computer Vision Measurement Workflows</h3>
          <p className="text-sm text-slate-500">Configure image processing pipelines for dimension extraction</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h4 className="font-semibold text-slate-900">Workflows</h4>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {workflows.map((workflow) => {
                const TypeIcon = WORKFLOW_TYPES.find((t) => t.id === workflow.workflow_type)?.icon || Scan;
                return (
                  <button
                    key={workflow.id}
                    onClick={() => {
                      setSelectedWorkflow(workflow);
                      setEditMode(false);
                    }}
                    className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${
                      selectedWorkflow?.id === workflow.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TypeIcon className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-slate-900 text-sm truncate">{workflow.workflow_name}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{workflow.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {currentData ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-blue-600" />
                  {editMode ? (
                    <input
                      type="text"
                      value={editedWorkflow.workflow_name || ''}
                      onChange={(e) => setEditedWorkflow({ ...editedWorkflow, workflow_name: e.target.value })}
                      className="font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1"
                    />
                  ) : (
                    <h4 className="font-semibold text-slate-900">{currentData.workflow_name}</h4>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <>
                      <IconButton
                        icon={<X />}
                        onClick={() => { setEditMode(false); setEditedWorkflow({}); }}
                        variant="ghost"
                        tooltip="Cancel"
                      />
                      <PrimaryButton
                        onClick={handleSave}
                        loading={saving}
                        disabled={saving}
                        icon={<Check />}
                        iconPosition="left"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Save
                      </PrimaryButton>
                    </>
                  ) : (
                    <PrimaryButton
                      onClick={() => { setEditMode(true); setEditedWorkflow(selectedWorkflow!); }}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Edit
                    </PrimaryButton>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Zap className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-amber-900 mb-1">CV Processing Pipeline</h5>
                      <p className="text-sm text-amber-700">This workflow defines how images are processed to extract accurate measurements. Configure detection, calibration, and processing parameters.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => toggleSection('detection')} className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-slate-900">Object Detection</span>
                    </div>
                    {expandedSections.detection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.detection && (
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                        <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm">{(currentData as CVWorkflow).detection_config?.model}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confidence Threshold</label>
                        {editMode ? (
                          <NumberInput
                            value={editedWorkflow.detection_config?.confidence_threshold || 0.7}
                            onChange={(value) => updateConfig('detection_config.confidence_threshold', value)}
                            step={0.1}
                            min={0}
                            max={1}
                          />
                        ) : (
                          <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm">{(currentData as CVWorkflow).detection_config?.confidence_threshold}</div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Classes</label>
                        <div className="flex flex-wrap gap-2">
                          {(currentData as CVWorkflow).detection_config?.target_classes?.map((cls, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{cls}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => toggleSection('calibration')} className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100">
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-slate-900">Calibration</span>
                    </div>
                    {expandedSections.calibration ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.calibration && (
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Calibration Method</label>
                        <div className="grid grid-cols-2 gap-2">
                          {CALIBRATION_METHODS.map((method) => (
                            <button
                              key={method.id}
                              onClick={() => editMode && updateConfig('calibration_method', method.id)}
                              className={`p-3 rounded-lg border text-left transition-colors ${
                                (currentData as CVWorkflow).calibration_method === method.id
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="font-medium text-sm text-slate-900">{method.name}</div>
                              <div className="text-xs text-slate-500">{method.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Reference Objects</label>
                        <div className="space-y-2">
                          {(currentData as CVWorkflow).reference_objects?.map((obj, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                              <span className="font-medium text-sm text-slate-700">{obj.name.replace('_', ' ')}</span>
                              <span className="text-xs text-slate-500">{obj.width_inches}" x {obj.height_inches}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => toggleSection('preprocessing')} className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-slate-900">Preprocessing Pipeline</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">{(currentData as CVWorkflow).preprocessing_steps?.length || 0} steps</span>
                    </div>
                    {expandedSections.preprocessing ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.preprocessing && (
                    <div className="p-4">
                      <div className="space-y-2">
                        {(currentData as CVWorkflow).preprocessing_steps?.map((step, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
                            <span className="font-medium text-sm text-slate-900 capitalize">{step.step.replace('_', ' ')}</span>
                            <code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{JSON.stringify(step.params)}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => toggleSection('edge')} className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100">
                    <div className="flex items-center gap-2">
                      <Maximize className="w-4 h-4 text-slate-600" />
                      <span className="font-medium text-slate-900">Edge Detection</span>
                    </div>
                    {expandedSections.edge ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.edge && (
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Algorithm</label>
                        <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm capitalize">{(currentData as CVWorkflow).edge_detection_params?.algorithm}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Aperture Size</label>
                        <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm">{(currentData as CVWorkflow).edge_detection_params?.aperture_size}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Low Threshold</label>
                        <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm">{(currentData as CVWorkflow).edge_detection_params?.low_threshold}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">High Threshold</label>
                        <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm">{(currentData as CVWorkflow).edge_detection_params?.high_threshold}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => toggleSection('accuracy')} className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-slate-900">Accuracy Thresholds</span>
                    </div>
                    {expandedSections.accuracy ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {expandedSections.accuracy && (
                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-3">
                        {['excellent', 'good', 'acceptable', 'minimum_confidence'].map((key) => (
                          <div key={key} className="text-center p-3 bg-slate-50 rounded-lg">
                            <div className="text-lg font-bold text-slate-900">
                              {((currentData as CVWorkflow).accuracy_thresholds?.[key as keyof CVWorkflow['accuracy_thresholds']] * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-slate-500 capitalize">{key.replace('_', ' ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Scan className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Workflow</h3>
              <p className="text-slate-600 mb-4">Choose a workflow from the list or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
