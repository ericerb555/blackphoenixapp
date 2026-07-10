/**
 * Bid Room Auto-Post Logic
 * AI-powered automatic job posting from subcontractor applications
 */

import { toast } from 'sonner@2.0.3';
import { BidRoomAutoPostConfig, getCategoryByName } from './constants/jobCategories';

export interface JobSubmission {
  title: string;
  description: string;
  jobCategory: string;
  customerName: string;
  customerLocation: string;
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requirements: string[];
  type: 'quote' | 'work-request' | 'emergency';
  submittedBy?: string;
  attachments?: string[];
}

export interface AutoPostResult {
  shouldPost: boolean;
  reason: string;
  postedToQueue?: boolean;
}

/**
 * Determines if a job should be auto-posted to Bid Room based on configuration
 */
export function shouldAutoPostToBidRoom(
  job: JobSubmission,
  config: BidRoomAutoPostConfig
): AutoPostResult {
  // Check if auto-post is enabled
  if (!config.enabled) {
    return {
      shouldPost: false,
      reason: 'Auto-post is disabled',
    };
  }

  // Check minimum budget requirement
  if (job.budgetMin < config.minimumBudget) {
    return {
      shouldPost: false,
      reason: `Budget ($${job.budgetMin}) is below minimum threshold ($${config.minimumBudget})`,
    };
  }

  // Check if priority matches auto-post criteria
  if (!config.autoPostPriorities.includes(job.priority)) {
    return {
      shouldPost: false,
      reason: `Priority "${job.priority}" is not configured for auto-posting`,
    };
  }

  // Check if category is valid
  const category = getCategoryByName(job.jobCategory);
  if (!category) {
    return {
      shouldPost: false,
      reason: `Invalid job category: ${job.jobCategory}`,
    };
  }

  // If admin approval required, add to queue
  if (config.requireAdminApproval) {
    return {
      shouldPost: false,
      reason: 'Queued for admin approval',
      postedToQueue: true,
    };
  }

  // All checks passed - auto-post!
  return {
    shouldPost: true,
    reason: `Auto-posting: ${job.priority} priority, $${job.budgetMin}-$${job.budgetMax} budget, ${job.jobCategory} category`,
  };
}

/**
 * AI-powered job categorization from description
 * Uses pattern matching to suggest category if not provided
 */
export function suggestJobCategory(description: string, title: string): string | null {
  const text = `${title} ${description}`.toLowerCase();

  // Category detection patterns
  const patterns: Record<string, string[]> = {
    'Electrical': ['electric', 'wiring', 'panel', 'outlet', 'circuit', 'breaker', 'voltage'],
    'Plumbing': ['plumb', 'pipe', 'drain', 'faucet', 'toilet', 'water heater', 'sewer'],
    'HVAC': ['hvac', 'heating', 'cooling', 'air condition', 'furnace', 'ac unit', 'ventilation'],
    'Roofing': ['roof', 'shingle', 'gutter', 'flashing', 'leak'],
    'Kitchen Renovation': ['kitchen', 'cabinet', 'countertop', 'appliance'],
    'Bathroom Renovation': ['bathroom', 'shower', 'tub', 'vanity', 'tile'],
    'Flooring': ['floor', 'carpet', 'hardwood', 'tile', 'laminate', 'vinyl'],
    'Interior Painting': ['paint', 'interior', 'wall', 'ceiling'],
    'Exterior Painting': ['paint', 'exterior', 'siding'],
    'Landscaping': ['landscape', 'lawn', 'garden', 'tree', 'plant', 'irrigation'],
    'Concrete Work': ['concrete', 'driveway', 'sidewalk', 'foundation', 'slab'],
    'Drywall': ['drywall', 'sheetrock', 'taping', 'mudding'],
    'Framing': ['fram', 'stud', 'joist', 'beam', 'structural'],
    'Demolition': ['demo', 'tear down', 'remove', 'demolish'],
    'Windows & Doors': ['window', 'door', 'installation'],
    'Decks': ['deck', 'patio', 'porch'],
    'Siding': ['siding', 'exterior wall'],
    'Insulation': ['insulation', 'insulate', 'r-value'],
    'Site Work': ['excavat', 'grading', 'site prep', 'land clearing'],
  };

  // Find best matching category
  let bestMatch: { category: string; score: number } | null = null;

  for (const [category, keywords] of Object.entries(patterns)) {
    const matchCount = keywords.filter(keyword => text.includes(keyword)).length;
    if (matchCount > 0) {
      const score = matchCount / keywords.length;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { category, score };
      }
    }
  }

  return bestMatch && bestMatch.score > 0.3 ? bestMatch.category : null;
}

/**
 * Estimate qualified contractor count based on category
 */
export function estimateQualifiedContractors(category: string): number {
  // Mock function - in production, this would query the database
  const estimates: Record<string, number> = {
    'Electrical': 45,
    'Plumbing': 52,
    'HVAC': 38,
    'Roofing': 41,
    'Kitchen Renovation': 28,
    'Bathroom Renovation': 32,
    'Flooring': 35,
    'Interior Painting': 48,
    'Exterior Painting': 42,
    'Landscaping': 36,
    'Concrete Work': 29,
    'Drywall': 44,
    'Framing': 31,
    'Demolition': 22,
  };

  return estimates[category] || 25; // Default estimate
}

/**
 * Generate AI-powered notification message for contractors
 */
export function generateContractorNotification(job: JobSubmission): string {
  const budgetRange = `$${job.budgetMin.toLocaleString()}-$${job.budgetMax.toLocaleString()}`;
  const urgency = job.priority === 'urgent' ? '🚨 URGENT: ' : 
                  job.priority === 'high' ? '⚡ HIGH PRIORITY: ' : '';
  
  return `${urgency}New ${job.jobCategory} job posted!\n` +
         `${job.title}\n` +
         `Budget: ${budgetRange}\n` +
         `Location: ${job.customerLocation}\n` +
         `Deadline: ${new Date(job.deadline).toLocaleDateString()}`;
}

/**
 * Post job to Bid Room (connects to actual job posting logic)
 */
export async function postJobToBidRoom(
  job: JobSubmission,
  config: BidRoomAutoPostConfig
): Promise<{ success: boolean; message: string; jobId?: string }> {
  try {
    const autoPostCheck = shouldAutoPostToBidRoom(job, config);

    if (!autoPostCheck.shouldPost && !autoPostCheck.postedToQueue) {
      return {
        success: false,
        message: autoPostCheck.reason,
      };
    }

    // In production, this would call the API to create the job
    // For now, we'll simulate success
    
    const jobId = `BID-${Date.now()}`;
    const qualifiedContractors = estimateQualifiedContractors(job.jobCategory);

    // Show notification
    if (config.notifyAdminOnAutoPost) {
      toast.success(
        autoPostCheck.postedToQueue 
          ? `Job queued for admin approval`
          : `Job auto-posted to Bid Room!`,
        {
          description: `${qualifiedContractors} qualified ${job.jobCategory} contractors will be notified`,
        }
      );
    }

    return {
      success: true,
      message: autoPostCheck.postedToQueue
        ? `Job queued for admin approval (${autoPostCheck.reason})`
        : `Successfully posted to Bid Room - ${qualifiedContractors} contractors notified`,
      jobId,
    };
  } catch (error) {
    console.error('Error auto-posting to Bid Room:', error);
    return {
      success: false,
      message: 'Failed to post job to Bid Room',
    };
  }
}
