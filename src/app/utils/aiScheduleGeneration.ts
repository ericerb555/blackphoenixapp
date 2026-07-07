/**
 * AI-Powered Project Schedule Generation
 * 
 * Generates intelligent construction schedules based on:
 * - Work request details
 * - AI floor plan analysis
 * - Quote materials and labor
 * - Industry best practices
 * - Weather considerations
 * - Inspection requirements
 */

export interface ScheduleTask {
  id: string;
  taskNumber: number;
  name: string;
  phase: string;
  description: string;
  duration: number; // hours
  durationDays: number;
  startDate: string | null; // ISO date
  endDate: string | null; // ISO date
  dependencies: string[]; // task IDs
  assignedTo: string[];
  materials: string[];
  equipment: string[];
  inspectionRequired: boolean;
  inspectionType?: string;
  criticalPath: boolean;
  status: 'not-started' | 'in-progress' | 'completed' | 'delayed' | 'blocked';
  progress: number; // 0-100
  cost: number;
  notes: string[];
}

export interface MaterialDelivery {
  id: string;
  deliveryNumber: number;
  material: string;
  quantity: string;
  supplier: string;
  scheduledDate: string | null;
  requiredFor: string[]; // task IDs
  leadTime: number; // days
  cost: number;
  status: 'pending' | 'ordered' | 'scheduled' | 'delivered' | 'delayed';
  notes: string;
}

export interface Inspection {
  id: string;
  type: string;
  category: 'electrical' | 'plumbing' | 'building' | 'final' | 'other';
  scheduledDate: string | null;
  inspector: string;
  relatedTasks: string[];
  prerequisites: string[];
  status: 'pending' | 'scheduled' | 'passed' | 'failed' | 'requires-revision';
  estimatedDuration: number; // hours
  cost: number;
  notes: string;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  description: string;
  targetDate: string | null;
  associatedTasks: string[];
  completed: boolean;
  criticalPath: boolean;
}

export interface ProjectSchedule {
  id: string;
  projectName: string;
  projectType: string;
  generatedAt: string;
  estimatedStartDate: string | null;
  estimatedEndDate: string | null;
  totalDuration: number; // days
  totalCost: number;
  
  // Schedule components
  tasks: ScheduleTask[];
  materialDeliveries: MaterialDelivery[];
  inspections: Inspection[];
  milestones: ProjectMilestone[];
  
  // Analytics
  criticalPath: string[]; // task IDs
  totalLaborHours: number;
  workingDays: number;
  bufferDays: number;
  
  // Metadata
  aiGenerated: boolean;
  confidence: number; // 0-100
  assumptions: string[];
  risks: string[];
  recommendations: string[];
}

interface WorkRequestData {
  id?: string;
  serviceType: string;
  title: string;
  description?: string;
  budgetMin?: number;
  budgetMax?: number;
  aiVideoAnalysis?: {
    dimensions?: {
      length: number;
      width: number;
      height: number;
      squareFootage: number;
    };
    estimatedRenovationCost?: {
      min: number;
      max: number;
    };
    estimated_duration_hours?: number;
  };
  ai_analysis?: {
    estimated_duration_hours?: number;
    complexity_level?: 'low' | 'moderate' | 'high' | 'very-high';
  };
}

interface QuoteData {
  materials?: Array<{
    name: string;
    quantity: number;
    unit: string;
    totalCost: number;
    category?: string;
  }>;
  labor?: Array<{
    role: string;
    hours: number;
    totalCost: number;
  }>;
  processSteps?: Array<{
    stepNumber: number;
    title: string;
    description: string;
    estimatedDuration: string;
    dependencies?: string[];
  }>;
}

/**
 * Generate AI-powered project schedule from work request and quote
 */
export function generateAIProjectSchedule(
  workRequest: WorkRequestData,
  quote?: QuoteData
): ProjectSchedule {
  const scheduleId = `SCH-${Date.now()}`;
  const generatedAt = new Date().toISOString();
  
  // Determine project complexity
  const complexity = determineProjectComplexity(workRequest, quote);
  
  // Generate tasks from quote process steps or create standard tasks
  const tasks = quote?.processSteps 
    ? generateTasksFromQuote(quote, workRequest)
    : generateStandardTasks(workRequest);
  
  // Calculate critical path
  const criticalPath = calculateCriticalPath(tasks);
  
  // Mark critical path tasks
  tasks.forEach(task => {
    task.criticalPath = criticalPath.includes(task.id);
  });
  
  // Generate material delivery schedule
  const materialDeliveries = generateMaterialDeliveries(quote, tasks);
  
  // Generate inspection schedule
  const inspections = generateInspectionSchedule(tasks, workRequest);
  
  // Generate milestones
  const milestones = generateProjectMilestones(tasks);
  
  // Calculate total duration
  const totalDuration = calculateProjectDuration(tasks);
  const bufferDays = Math.ceil(totalDuration * 0.15); // 15% buffer
  
  // Calculate dates if we have a start date
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 7); // Start in 1 week (permit time)
  
  assignTaskDates(tasks, startDate);
  assignDeliveryDates(materialDeliveries, tasks);
  assignInspectionDates(inspections, tasks);
  assignMilestoneDates(milestones, tasks);
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDuration + bufferDays);
  
  // Calculate totals
  const totalCost = tasks.reduce((sum, task) => sum + task.cost, 0);
  const totalLaborHours = tasks.reduce((sum, task) => sum + task.duration, 0);
  
  // Generate AI insights
  const assumptions = generateAssumptions(workRequest, complexity);
  const risks = identifyProjectRisks(workRequest, tasks, complexity);
  const recommendations = generateRecommendations(tasks, risks, complexity);
  
  return {
    id: scheduleId,
    projectName: workRequest.title || `${workRequest.serviceType} Project`,
    projectType: workRequest.serviceType,
    generatedAt,
    estimatedStartDate: startDate.toISOString(),
    estimatedEndDate: endDate.toISOString(),
    totalDuration,
    totalCost,
    
    tasks,
    materialDeliveries,
    inspections,
    milestones,
    
    criticalPath,
    totalLaborHours,
    workingDays: totalDuration,
    bufferDays,
    
    aiGenerated: true,
    confidence: calculateScheduleConfidence(workRequest, quote),
    assumptions,
    risks,
    recommendations
  };
}

/**
 * Determine project complexity based on work request and quote data
 */
function determineProjectComplexity(
  workRequest: WorkRequestData,
  quote?: QuoteData
): 'low' | 'moderate' | 'high' | 'very-high' {
  // Check AI analysis complexity if available
  if (workRequest.ai_analysis?.complexity_level) {
    return workRequest.ai_analysis.complexity_level;
  }
  
  // Estimate based on budget
  const budget = workRequest.budgetMax || workRequest.budgetMin || 0;
  if (budget < 5000) return 'low';
  if (budget < 20000) return 'moderate';
  if (budget < 50000) return 'high';
  return 'very-high';
}

/**
 * Generate tasks from quote process steps
 */
function generateTasksFromQuote(
  quote: QuoteData,
  workRequest: WorkRequestData
): ScheduleTask[] {
  if (!quote.processSteps || quote.processSteps.length === 0) {
    return generateStandardTasks(workRequest);
  }
  
  return quote.processSteps.map((step, index) => {
    const duration = parseDuration(step.estimatedDuration);
    const materials = extractMaterialsForStep(step, quote.materials);
    const cost = calculateStepCost(step, quote);
    
    return {
      id: `task-${step.stepNumber}`,
      taskNumber: step.stepNumber,
      name: step.title,
      phase: determinePhase(step.title),
      description: step.description,
      duration: duration * 8, // Convert days to hours
      durationDays: duration,
      startDate: null,
      endDate: null,
      dependencies: step.dependencies || (index > 0 ? [`task-${step.stepNumber - 1}`] : []),
      assignedTo: determineAssignedRoles(step.title),
      materials,
      equipment: determineRequiredEquipment(step.title),
      inspectionRequired: requiresInspection(step.title),
      inspectionType: getInspectionType(step.title),
      criticalPath: false,
      status: 'not-started',
      progress: 0,
      cost,
      notes: extractNotesFromDescription(step.description)
    };
  });
}

/**
 * Generate standard tasks for projects without detailed quotes
 */
function generateStandardTasks(workRequest: WorkRequestData): ScheduleTask[] {
  const serviceType = workRequest.serviceType.toLowerCase();
  
  if (serviceType.includes('kitchen')) {
    return generateKitchenRenovationTasks(workRequest);
  } else if (serviceType.includes('bathroom')) {
    return generateBathroomRenovationTasks(workRequest);
  } else if (serviceType.includes('paint')) {
    return generatePaintingTasks(workRequest);
  } else if (serviceType.includes('floor')) {
    return generateFlooringTasks(workRequest);
  } else {
    return generateGenericRenovationTasks(workRequest);
  }
}

/**
 * Generate kitchen renovation tasks
 */
function generateKitchenRenovationTasks(workRequest: WorkRequestData): ScheduleTask[] {
  const sqft = workRequest.aiVideoAnalysis?.dimensions?.squareFootage || 150;
  const baseMultiplier = sqft / 150; // Scale based on size
  
  return [
    {
      id: 'task-1',
      taskNumber: 1,
      name: 'Permit Application & Approval',
      phase: 'Pre-Construction',
      description: 'Submit plans and obtain building permits',
      duration: 40,
      durationDays: 5,
      startDate: null,
      endDate: null,
      dependencies: [],
      assignedTo: ['Project Manager'],
      materials: [],
      equipment: [],
      inspectionRequired: false,
      criticalPath: false,
      status: 'not-started',
      progress: 0,
      cost: 900,
      notes: ['Allow 5-7 business days for approval']
    },
    {
      id: 'task-2',
      taskNumber: 2,
      name: 'Site Protection & Preparation',
      phase: 'Pre-Construction',
      description: 'Install floor protection, dust barriers, and safety measures',
      duration: 8,
      durationDays: 1,
      startDate: null,
      endDate: null,
      dependencies: ['task-1'],
      assignedTo: ['General Laborer'],
      materials: ['Floor Protection', 'Dust Barriers', 'Tape'],
      equipment: ['Safety Equipment'],
      inspectionRequired: false,
      criticalPath: false,
      status: 'not-started',
      progress: 0,
      cost: 350,
      notes: []
    },
    {
      id: 'task-3',
      taskNumber: 3,
      name: 'Demolition',
      phase: 'Demolition',
      description: 'Remove existing cabinets, countertops, appliances, and flooring',
      duration: Math.ceil(24 * baseMultiplier),
      durationDays: Math.ceil(3 * baseMultiplier),
      startDate: null,
      endDate: null,
      dependencies: ['task-2'],
      assignedTo: ['Demolition Specialist', 'Laborer'],
      materials: ['Dumpster'],
      equipment: ['Sledgehammer', 'Pry Bars', 'Sawzall'],
      inspectionRequired: false,
      criticalPath: true,
      status: 'not-started',
      progress: 0,
      cost: 1440,
      notes: ['Protect adjacent areas', 'Label items to be reused']
    },
    // Add more tasks...
    {
      id: 'task-4',
      taskNumber: 4,
      name: 'Electrical Rough-In',
      phase: 'Rough-In',
      description: 'Install new circuits, wiring, and electrical boxes',
      duration: 24,
      durationDays: 3,
      startDate: null,
      endDate: null,
      dependencies: ['task-3'],
      assignedTo: ['Licensed Electrician', 'Electrician Helper'],
      materials: ['Romex Wire', 'Electrical Boxes', 'Circuit Breakers'],
      equipment: ['Wire Strippers', 'Fish Tape', 'Drill'],
      inspectionRequired: true,
      inspectionType: 'Electrical Rough-In',
      criticalPath: true,
      status: 'not-started',
      progress: 0,
      cost: 4200,
      notes: ['Schedule inspection after completion']
    },
    {
      id: 'task-5',
      taskNumber: 5,
      name: 'Plumbing Rough-In',
      phase: 'Rough-In',
      description: 'Install water supply lines, drain lines, and gas line',
      duration: 16,
      durationDays: 2,
      startDate: null,
      endDate: null,
      dependencies: ['task-3'],
      assignedTo: ['Licensed Plumber', 'Plumber Helper'],
      materials: ['PEX Tubing', 'Drain Pipe', 'Fittings', 'Gas Pipe'],
      equipment: ['Pipe Cutter', 'Torch', 'Press Tool'],
      inspectionRequired: true,
      inspectionType: 'Plumbing Rough-In',
      criticalPath: true,
      status: 'not-started',
      progress: 0,
      cost: 3680,
      notes: ['Pressure test all lines']
    }
  ];
}

/**
 * Helper functions for schedule generation
 */

function parseDuration(durationStr: string): number {
  // Parse strings like "3 days", "1-2 days", "5-7 business days"
  const match = durationStr.match(/(\d+)(?:-(\d+))?\s*(day|hour|week)/i);
  if (!match) return 1;
  
  const min = parseInt(match[1]);
  const max = match[2] ? parseInt(match[2]) : min;
  const avg = (min + max) / 2;
  const unit = match[3].toLowerCase();
  
  if (unit.startsWith('week')) return avg * 5; // Working days per week
  if (unit.startsWith('hour')) return avg / 8; // Convert to days
  return avg;
}

function extractMaterialsForStep(step: any, materials: any[] = []): string[] {
  // Extract materials mentioned in step description or title
  const stepText = `${step.title} ${step.description}`.toLowerCase();
  return materials
    .filter(m => stepText.includes(m.name.toLowerCase()))
    .map(m => m.name);
}

function calculateStepCost(step: any, quote: QuoteData): number {
  // Calculate cost based on materials and labor for this step
  const stepText = `${step.title} ${step.description}`.toLowerCase();
  
  const materialCost = (quote.materials || [])
    .filter(m => stepText.includes(m.name.toLowerCase()))
    .reduce((sum, m) => sum + m.totalCost, 0);
  
  const laborCost = (quote.labor || [])
    .filter(l => stepText.includes(l.role.toLowerCase()))
    .reduce((sum, l) => sum + l.totalCost, 0);
  
  return materialCost + laborCost;
}

function determinePhase(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('permit') || lower.includes('planning')) return 'Pre-Construction';
  if (lower.includes('demolition') || lower.includes('removal')) return 'Demolition';
  if (lower.includes('rough') || lower.includes('electrical') || lower.includes('plumbing')) return 'Rough-In';
  if (lower.includes('drywall') || lower.includes('insulation')) return 'Enclosure';
  if (lower.includes('paint') || lower.includes('flooring') || lower.includes('cabinet')) return 'Finishes';
  if (lower.includes('final') || lower.includes('cleanup')) return 'Completion';
  return 'Construction';
}

function determineAssignedRoles(title: string): string[] {
  const lower = title.toLowerCase();
  const roles: string[] = [];
  
  if (lower.includes('electrical')) roles.push('Licensed Electrician');
  if (lower.includes('plumbing')) roles.push('Licensed Plumber');
  if (lower.includes('paint')) roles.push('Professional Painter');
  if (lower.includes('cabinet')) roles.push('Master Carpenter');
  if (lower.includes('countertop')) roles.push('Countertop Installer');
  if (lower.includes('tile')) roles.push('Tile Installer');
  if (lower.includes('floor')) roles.push('Flooring Specialist');
  if (lower.includes('demo')) roles.push('Demolition Specialist');
  
  if (roles.length === 0) roles.push('General Contractor');
  
  return roles;
}

function determineRequiredEquipment(title: string): string[] {
  const lower = title.toLowerCase();
  const equipment: string[] = [];
  
  if (lower.includes('demo')) equipment.push('Dumpster', 'Sledgehammer', 'Sawzall');
  if (lower.includes('electrical')) equipment.push('Wire Stripper', 'Drill', 'Fish Tape');
  if (lower.includes('plumbing')) equipment.push('Pipe Cutter', 'Torch', 'Press Tool');
  if (lower.includes('paint')) equipment.push('Sprayer', 'Rollers', 'Brushes');
  if (lower.includes('floor')) equipment.push('Floor Saw', 'Nailer', 'Trowel');
  
  return equipment;
}

function requiresInspection(title: string): boolean {
  const lower = title.toLowerCase();
  return lower.includes('inspection') || 
         lower.includes('electrical rough') ||
         lower.includes('plumbing rough') ||
         lower.includes('final');
}

function getInspectionType(title: string): string | undefined {
  const lower = title.toLowerCase();
  if (lower.includes('electrical')) return 'Electrical';
  if (lower.includes('plumbing')) return 'Plumbing';
  if (lower.includes('final')) return 'Final Building';
  if (lower.includes('inspection')) return 'Building';
  return undefined;
}

function extractNotesFromDescription(description: string): string[] {
  // Extract important notes from description
  const notes: string[] = [];
  if (description.includes('HEPA')) notes.push('Use HEPA filtration');
  if (description.includes('pressure test')) notes.push('Pressure test required');
  if (description.includes('cure')) notes.push('Allow proper curing time');
  return notes;
}

function calculateCriticalPath(tasks: ScheduleTask[]): string[] {
  // Simplified critical path calculation
  // In production, use proper CPM algorithm
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const criticalTasks: string[] = [];
  
  // Find tasks with no successors (end tasks)
  const endTasks = tasks.filter(t => 
    !tasks.some(other => other.dependencies.includes(t.id))
  );
  
  // Trace back from end tasks following dependencies
  function tracePath(taskId: string) {
    if (criticalTasks.includes(taskId)) return;
    criticalTasks.push(taskId);
    
    const task = taskMap.get(taskId);
    if (task && task.dependencies.length > 0) {
      // Follow the longest dependency path
      const longestDep = task.dependencies[0]; // Simplified
      tracePath(longestDep);
    }
  }
  
  endTasks.forEach(t => tracePath(t.id));
  
  return criticalTasks;
}

function calculateProjectDuration(tasks: ScheduleTask[]): number {
  // Calculate total duration considering dependencies
  // Simplified: sum of all critical path tasks
  let maxDuration = 0;
  
  tasks.forEach(task => {
    const pathDuration = calculateTaskEndDay(task, tasks);
    if (pathDuration > maxDuration) {
      maxDuration = pathDuration;
    }
  });
  
  return Math.ceil(maxDuration);
}

function calculateTaskEndDay(task: ScheduleTask, allTasks: ScheduleTask[]): number {
  if (task.dependencies.length === 0) {
    return task.durationDays;
  }
  
  const taskMap = new Map(allTasks.map(t => [t.id, t]));
  const depEndDays = task.dependencies.map(depId => {
    const depTask = taskMap.get(depId);
    return depTask ? calculateTaskEndDay(depTask, allTasks) : 0;
  });
  
  const latestDepEnd = Math.max(...depEndDays);
  return latestDepEnd + task.durationDays;
}

function assignTaskDates(tasks: ScheduleTask[], startDate: Date) {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  tasks.forEach(task => {
    const depEndDays = task.dependencies.map(depId => {
      const depTask = taskMap.get(depId);
      if (!depTask || !depTask.endDate) return 0;
      
      const depEnd = new Date(depTask.endDate);
      const start = new Date(startDate);
      return Math.ceil((depEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });
    
    const startDay = depEndDays.length > 0 ? Math.max(...depEndDays) : 0;
    const taskStart = new Date(startDate);
    taskStart.setDate(taskStart.getDate() + startDay);
    
    const taskEnd = new Date(taskStart);
    taskEnd.setDate(taskEnd.getDate() + task.durationDays);
    
    task.startDate = taskStart.toISOString();
    task.endDate = taskEnd.toISOString();
  });
}

function generateMaterialDeliveries(quote: QuoteData | undefined, tasks: ScheduleTask[]): MaterialDelivery[] {
  if (!quote?.materials) return [];
  
  return quote.materials.map((material, index) => {
    const relatedTasks = tasks
      .filter(t => t.materials.includes(material.name))
      .map(t => t.id);
    
    return {
      id: `delivery-${index + 1}`,
      deliveryNumber: index + 1,
      material: material.name,
      quantity: `${material.quantity} ${material.unit}`,
      supplier: 'TBD',
      scheduledDate: null,
      requiredFor: relatedTasks,
      leadTime: estimateLeadTime(material.name),
      cost: material.totalCost,
      status: 'pending',
      notes: `Required for ${relatedTasks.length} task(s)`
    };
  });
}

function estimateLeadTime(materialName: string): number {
  const lower = materialName.toLowerCase();
  if (lower.includes('cabinet')) return 21; // 3 weeks
  if (lower.includes('countertop') || lower.includes('granite')) return 14; // 2 weeks
  if (lower.includes('appliance')) return 7; // 1 week
  if (lower.includes('window') || lower.includes('door')) return 10; // 1.5 weeks
  return 3; // Default 3 days
}

function assignDeliveryDates(deliveries: MaterialDelivery[], tasks: ScheduleTask[]) {
  deliveries.forEach(delivery => {
    if (delivery.requiredFor.length > 0) {
      const firstTask = tasks.find(t => t.id === delivery.requiredFor[0]);
      if (firstTask && firstTask.startDate) {
        const taskStart = new Date(firstTask.startDate);
        taskStart.setDate(taskStart.getDate() - delivery.leadTime - 1); // Order before needed
        delivery.scheduledDate = taskStart.toISOString();
      }
    }
  });
}

function generateInspectionSchedule(tasks: ScheduleTask[], workRequest: WorkRequestData): Inspection[] {
  const inspections: Inspection[] = [];
  let inspectionNum = 1;
  
  tasks.forEach(task => {
    if (task.inspectionRequired && task.inspectionType) {
      inspections.push({
        id: `inspection-${inspectionNum}`,
        type: task.inspectionType,
        category: task.inspectionType.toLowerCase().includes('electrical') ? 'electrical' :
                  task.inspectionType.toLowerCase().includes('plumbing') ? 'plumbing' :
                  task.inspectionType.toLowerCase().includes('final') ? 'final' : 'building',
        scheduledDate: null,
        inspector: 'Building Department',
        relatedTasks: [task.id],
        prerequisites: [task.id],
        status: 'pending',
        estimatedDuration: 2,
        cost: 0, // Usually included in permit fees
        notes: `Schedule after completing ${task.name}`
      });
      inspectionNum++;
    }
  });
  
  return inspections;
}

function assignInspectionDates(inspections: Inspection[], tasks: ScheduleTask[]) {
  inspections.forEach(inspection => {
    const relatedTask = tasks.find(t => inspection.relatedTasks.includes(t.id));
    if (relatedTask && relatedTask.endDate) {
      const taskEnd = new Date(relatedTask.endDate);
      taskEnd.setDate(taskEnd.getDate() + 1); // Next day after task completion
      inspection.scheduledDate = taskEnd.toISOString();
    }
  });
}

function generateProjectMilestones(tasks: ScheduleTask[]): ProjectMilestone[] {
  const milestones: ProjectMilestone[] = [];
  
  // Milestone 1: Permits Approved
  const permitTask = tasks.find(t => t.name.toLowerCase().includes('permit'));
  if (permitTask) {
    milestones.push({
      id: 'milestone-1',
      name: 'Permits Approved',
      description: 'All necessary permits obtained and approved',
      targetDate: null,
      associatedTasks: [permitTask.id],
      completed: false,
      criticalPath: true
    });
  }
  
  // Milestone 2: Demolition Complete
  const demoTask = tasks.find(t => t.name.toLowerCase().includes('demo'));
  if (demoTask) {
    milestones.push({
      id: 'milestone-2',
      name: 'Demolition Complete',
      description: 'Site cleared and ready for new construction',
      targetDate: null,
      associatedTasks: [demoTask.id],
      completed: false,
      criticalPath: true
    });
  }
  
  // Milestone 3: Rough-In Inspections Passed
  const roughTasks = tasks.filter(t => 
    t.phase === 'Rough-In' && t.inspectionRequired
  );
  if (roughTasks.length > 0) {
    milestones.push({
      id: 'milestone-3',
      name: 'Rough-In Inspections Passed',
      description: 'All MEP rough-in work inspected and approved',
      targetDate: null,
      associatedTasks: roughTasks.map(t => t.id),
      completed: false,
      criticalPath: true
    });
  }
  
  // Milestone 4: Final Inspection
  const finalTask = tasks.find(t => t.name.toLowerCase().includes('final'));
  if (finalTask) {
    milestones.push({
      id: 'milestone-4',
      name: 'Final Inspection Passed',
      description: 'Project complete and ready for occupancy',
      targetDate: null,
      associatedTasks: [finalTask.id],
      completed: false,
      criticalPath: true
    });
  }
  
  return milestones;
}

function assignMilestoneDates(milestones: ProjectMilestone[], tasks: ScheduleTask[]) {
  milestones.forEach(milestone => {
    const latestTask = milestone.associatedTasks
      .map(taskId => tasks.find(t => t.id === taskId))
      .filter(t => t && t.endDate)
      .sort((a, b) => new Date(b!.endDate!).getTime() - new Date(a!.endDate!).getTime())[0];
    
    if (latestTask && latestTask.endDate) {
      milestone.targetDate = latestTask.endDate;
    }
  });
}

function calculateScheduleConfidence(
  workRequest: WorkRequestData,
  quote?: QuoteData
): number {
  let confidence = 70; // Base confidence
  
  // Increase confidence if we have detailed quote
  if (quote?.processSteps && quote.processSteps.length > 10) {
    confidence += 15;
  }
  
  // Increase if we have AI analysis
  if (workRequest.aiVideoAnalysis) {
    confidence += 10;
  }
  
  // Decrease if very complex or high budget uncertainty
  if (workRequest.budgetMax && workRequest.budgetMin) {
    const budgetRange = workRequest.budgetMax - workRequest.budgetMin;
    if (budgetRange > 30000) {
      confidence -= 10;
    }
  }
  
  return Math.min(Math.max(confidence, 50), 95); // Clamp 50-95
}

function generateAssumptions(
  workRequest: WorkRequestData,
  complexity: string
): string[] {
  return [
    'Standard 8-hour workdays (Mon-Fri)',
    'No major weather delays',
    'Materials available per lead times',
    'Inspections scheduled within 1-2 business days',
    'No hidden structural issues discovered',
    'Client decisions made within 24 hours',
    'Site accessible during all work hours',
    '15% buffer included for contingencies'
  ];
}

function identifyProjectRisks(
  workRequest: WorkRequestData,
  tasks: ScheduleTask[],
  complexity: string
): string[] {
  const risks: string[] = [];
  
  if (complexity === 'high' || complexity === 'very-high') {
    risks.push('Complex project may uncover unexpected issues');
  }
  
  const hasInspections = tasks.some(t => t.inspectionRequired);
  if (hasInspections) {
    risks.push('Inspection delays could impact schedule');
  }
  
  const longLeadItems = tasks.some(t => 
    t.materials.some(m => 
      m.toLowerCase().includes('cabinet') || 
      m.toLowerCase().includes('countertop')
    )
  );
  if (longLeadItems) {
    risks.push('Long-lead items (cabinets, countertops) may have extended delivery times');
  }
  
  risks.push('Weather conditions may impact outdoor work');
  risks.push('Material price fluctuations may affect budget');
  
  return risks;
}

function generateRecommendations(
  tasks: ScheduleTask[],
  risks: string[],
  complexity: string
): string[] {
  const recommendations: string[] = [];
  
  recommendations.push('Order long-lead items (cabinets, countertops) immediately upon contract signing');
  recommendations.push('Schedule pre-construction meeting to finalize all selections');
  recommendations.push('Maintain daily communication during critical phases');
  
  const hasInspections = tasks.some(t => t.inspectionRequired);
  if (hasInspections) {
    recommendations.push('Schedule all required inspections in advance to avoid delays');
  }
  
  if (complexity === 'high' || complexity === 'very-high') {
    recommendations.push('Consider hiring project expeditor for complex coordination');
    recommendations.push('Build in additional contingency time for unexpected discoveries');
  }
  
  recommendations.push('Use this schedule as template for actual project management software');
  recommendations.push('Update schedule weekly as project progresses');
  
  return recommendations;
}

// Additional task generators for other project types
function generateBathroomRenovationTasks(workRequest: WorkRequestData): ScheduleTask[] {
  // Similar structure to kitchen but bathroom-specific
  return [];
}

function generatePaintingTasks(workRequest: WorkRequestData): ScheduleTask[] {
  return [];
}

function generateFlooringTasks(workRequest: WorkRequestData): ScheduleTask[] {
  return [];
}

function generateGenericRenovationTasks(workRequest: WorkRequestData): ScheduleTask[] {
  return [];
}
