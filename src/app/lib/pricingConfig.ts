/**
 * Pricing Configuration System
 * Centralized pricing settings for materials, labor, and profit margins
 */

export interface PricingConfig {
  // Material Pricing
  materialMarkup: number; // Default material markup percentage
  materialMarkupByCategory?: {
    [category: string]: number; // Category-specific markups
  };
  
  // Labor Pricing
  laborRates: {
    laborer: number;
    carpenter: number;
    electrician: number;
    plumber: number;
    painter: number;
    hvacTech: number;
    projectManager: number;
    specialist: number;
  };
  laborMarkup: number; // Additional markup on labor (usually 0 for most contractors)
  
  // Profit & Overhead
  profitMargin: number; // Overall profit margin percentage
  overheadPercentage: number; // Overhead percentage
  
  // Tax
  taxRate: number; // Sales tax rate
  
  // Discounts
  allowDiscounts: boolean;
  maxDiscountPercentage: number;
}

// Default pricing configuration
export const defaultPricingConfig: PricingConfig = {
  // Materials - Default 30% markup
  materialMarkup: 30,
  materialMarkupByCategory: {
    'Cabinetry': 35,
    'Countertops': 40,
    'Appliances': 15,
    'Tile': 30,
    'Flooring': 30,
    'Paint': 25,
    'Plumbing': 30,
    'Electrical': 30,
    'HVAC Equipment': 20,
    'Ductwork': 30,
    'Fasteners': 100, // High markup on small items
    'Installation Materials': 50,
    'Adhesives': 50,
    'Sealants': 50,
    'General': 30,
  },
  
  // Labor rates per hour
  laborRates: {
    laborer: 45,
    carpenter: 75,
    electrician: 95,
    plumber: 105,
    painter: 65,
    hvacTech: 95,
    projectManager: 85,
    specialist: 110,
  },
  laborMarkup: 0, // No additional markup on labor (profit comes from rates)
  
  // Profit & Overhead
  profitMargin: 15, // 15% profit margin applied to total
  overheadPercentage: 10, // 10% overhead
  
  // Tax
  taxRate: 8, // 8% sales tax
  
  // Discounts
  allowDiscounts: true,
  maxDiscountPercentage: 15,
};

// Load pricing config from localStorage or use defaults
export function loadPricingConfig(): PricingConfig {
  try {
    const stored = localStorage.getItem('pricingConfig');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      return {
        ...defaultPricingConfig,
        ...parsed,
        laborRates: {
          ...defaultPricingConfig.laborRates,
          ...(parsed.laborRates || {}),
        },
        materialMarkupByCategory: {
          ...defaultPricingConfig.materialMarkupByCategory,
          ...(parsed.materialMarkupByCategory || {}),
        },
      };
    }
  } catch (error) {
    console.error('Error loading pricing config:', error);
  }
  return defaultPricingConfig;
}

// Save pricing config to localStorage
export function savePricingConfig(config: PricingConfig): void {
  try {
    localStorage.setItem('pricingConfig', JSON.stringify(config));
  } catch (error) {
    console.error('Error saving pricing config:', error);
  }
}

// Apply markup to material cost based on category
export function applyMaterialMarkup(cost: number, category: string, config?: PricingConfig): number {
  const pricingConfig = config || loadPricingConfig();
  const markup = pricingConfig.materialMarkupByCategory?.[category] ?? pricingConfig.materialMarkup;
  return cost * (1 + markup / 100);
}

// Get labor rate for a specific role
export function getLaborRate(role: string, config?: PricingConfig): number {
  const pricingConfig = config || loadPricingConfig();
  const roleKey = role.toLowerCase().replace(/\s+/g, '') as keyof typeof pricingConfig.laborRates;
  return pricingConfig.laborRates[roleKey] || pricingConfig.laborRates.laborer;
}

// Calculate total with profit margin and overhead
export function applyProfitAndOverhead(subtotal: number, config?: PricingConfig): {
  subtotal: number;
  overhead: number;
  profit: number;
  total: number;
} {
  const pricingConfig = config || loadPricingConfig();
  const overhead = subtotal * (pricingConfig.overheadPercentage / 100);
  const profit = subtotal * (pricingConfig.profitMargin / 100);
  const total = subtotal + overhead + profit;
  
  return {
    subtotal,
    overhead,
    profit,
    total,
  };
}

// Calculate tax
export function calculateTax(amount: number, config?: PricingConfig): number {
  const pricingConfig = config || loadPricingConfig();
  return amount * (pricingConfig.taxRate / 100);
}

// Calculate final quote total with all fees
export function calculateQuoteTotal(
  materialsSubtotal: number,
  laborSubtotal: number,
  config?: PricingConfig,
  subscriptionDiscountPct: number = 0
): {
  materialsSubtotal: number;
  laborSubtotal: number;
  subtotal: number;
  overhead: number;
  profit: number;
  subtotalWithProfitOverhead: number;
  subscriptionDiscountPct: number;
  subscriptionDiscount: number;
  discountedSubtotal: number;
  tax: number;
  grandTotal: number;
} {
  const pricingConfig = config || loadPricingConfig();

  const subtotal = materialsSubtotal + laborSubtotal;
  const { overhead, profit, total: subtotalWithProfitOverhead } = applyProfitAndOverhead(subtotal, pricingConfig);

  // Subscription / maintenance-plan loyalty discount, applied pre-tax to the job cost.
  const pct = pricingConfig.allowDiscounts
    ? Math.max(0, Math.min(subscriptionDiscountPct, pricingConfig.maxDiscountPercentage))
    : 0;
  const subscriptionDiscount = subtotalWithProfitOverhead * (pct / 100);
  const discountedSubtotal = subtotalWithProfitOverhead - subscriptionDiscount;

  const tax = calculateTax(discountedSubtotal, pricingConfig);
  const grandTotal = discountedSubtotal + tax;

  return {
    materialsSubtotal,
    laborSubtotal,
    subtotal,
    overhead,
    profit,
    subtotalWithProfitOverhead,
    subscriptionDiscountPct: pct,
    subscriptionDiscount,
    discountedSubtotal,
    tax,
    grandTotal,
  };
}
