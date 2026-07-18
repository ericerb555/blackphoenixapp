/**
 * Vendor Priority Service
 * Manages vendor priority placement status based on subscriptions
 */

export type PriorityLevel = 'none' | 'bronze' | 'silver' | 'gold';

export interface VendorPriority {
  vendorKey: string;
  vendorName: string;
  priorityLevel: PriorityLevel;
  subscriptionId?: string;
  subscriptionName?: string;
  activeSince?: string;
  expiresAt?: string;
}

const STORAGE_KEY = 'vendor_priorities';

class VendorPriorityService {
  // Get all vendor priorities
  getAllPriorities(): VendorPriority[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Initialize with default vendors
    const defaultPriorities: VendorPriority[] = [
      {
        vendorKey: 'home-depot',
        vendorName: 'Home Depot',
        priorityLevel: 'silver',
        subscriptionId: 'SUB-HD-001',
        subscriptionName: 'Priority Placement - Silver',
        activeSince: '2025-01-01',
        expiresAt: '2026-01-01'
      },
      {
        vendorKey: 'lowes',
        vendorName: "Lowe's",
        priorityLevel: 'bronze',
        subscriptionId: 'SUB-LW-001',
        subscriptionName: 'Priority Placement - Bronze',
        activeSince: '2025-02-01',
        expiresAt: '2026-02-01'
      },
      {
        vendorKey: 'ferguson',
        vendorName: 'Ferguson',
        priorityLevel: 'gold',
        subscriptionId: 'SUB-FG-001',
        subscriptionName: 'Priority Placement - Gold',
        activeSince: '2024-12-01',
        expiresAt: '2025-12-01'
      },
      {
        vendorKey: 'grainger',
        vendorName: 'Grainger',
        priorityLevel: 'none'
      }
    ];
    
    this.savePriorities(defaultPriorities);
    return defaultPriorities;
  }

  // Get priority for a specific vendor
  getVendorPriority(vendorKey: string): VendorPriority | null {
    const priorities = this.getAllPriorities();
    return priorities.find(p => p.vendorKey === vendorKey) || null;
  }

  // Set vendor priority
  setVendorPriority(vendorKey: string, priority: VendorPriority): void {
    const priorities = this.getAllPriorities();
    const index = priorities.findIndex(p => p.vendorKey === vendorKey);
    
    if (index >= 0) {
      priorities[index] = priority;
    } else {
      priorities.push(priority);
    }
    
    this.savePriorities(priorities);
  }

  // Update priority level
  updatePriorityLevel(vendorKey: string, level: PriorityLevel, subscriptionData?: {
    subscriptionId: string;
    subscriptionName: string;
    activeSince: string;
    expiresAt: string;
  }): void {
    const priorities = this.getAllPriorities();
    const index = priorities.findIndex(p => p.vendorKey === vendorKey);
    
    if (index >= 0) {
      priorities[index].priorityLevel = level;
      if (subscriptionData) {
        priorities[index].subscriptionId = subscriptionData.subscriptionId;
        priorities[index].subscriptionName = subscriptionData.subscriptionName;
        priorities[index].activeSince = subscriptionData.activeSince;
        priorities[index].expiresAt = subscriptionData.expiresAt;
      }
    }
    
    this.savePriorities(priorities);
  }

  // Remove vendor priority
  removePriority(vendorKey: string): void {
    const priorities = this.getAllPriorities();
    const filtered = priorities.filter(p => p.vendorKey !== vendorKey);
    this.savePriorities(filtered);
  }

  // Get priority weight for sorting (higher = better)
  getPriorityWeight(level: PriorityLevel): number {
    switch (level) {
      case 'gold': return 100;
      case 'silver': return 50;
      case 'bronze': return 25;
      default: return 0;
    }
  }

  // Sort materials by vendor priority
  sortByPriority<T extends { vendorKey?: string }>(materials: T[]): T[] {
    return [...materials].sort((a, b) => {
      const priorityA = this.getVendorPriority(a.vendorKey || '');
      const priorityB = this.getVendorPriority(b.vendorKey || '');
      
      const weightA = this.getPriorityWeight(priorityA?.priorityLevel || 'none');
      const weightB = this.getPriorityWeight(priorityB?.priorityLevel || 'none');
      
      return weightB - weightA; // Higher priority first
    });
  }

  // Get badge color for priority level
  getPriorityBadgeColor(level: PriorityLevel): { bg: string; border: string; text: string } {
    switch (level) {
      case 'gold':
        return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' };
      case 'silver':
        return { bg: 'bg-gray-400/20', border: 'border-gray-400/50', text: 'text-gray-300' };
      case 'bronze':
        return { bg: 'bg-orange-700/20', border: 'border-orange-700/50', text: 'text-orange-400' };
      default:
        return { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-500' };
    }
  }

  // Save priorities to storage
  private savePriorities(priorities: VendorPriority[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(priorities));
  }
}

export const vendorPriorityService = new VendorPriorityService();
