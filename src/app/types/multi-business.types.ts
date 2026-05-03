/**
 * Multi-Business Management System
 * Core types and interfaces
 */

export interface BusinessProfile {
  id: string;
  name: string;
  legal_name: string;
  business_type: BusinessType;
  industry: string[];
  description: string;
  logo_url?: string;
  
  // Contact Information
  email: string;
  phone: string;
  website?: string;
  
  // Location
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Service Area
  service_radius_miles: number;
  service_areas: string[]; // Cities/regions served
  
  // Services Offered
  services: ServiceOffering[];
  
  // Business Details
  license_number?: string;
  insurance_info?: {
    provider: string;
    policy_number: string;
    expiry_date: string;
  };
  certifications: Certification[];
  
  // Performance Metrics
  metrics: {
    total_jobs_completed: number;
    average_rating: number;
    total_reviews: number;
    on_time_completion_rate: number;
    customer_satisfaction_rate: number;
    response_time_hours: number;
  };
  
  // Availability
  availability: {
    monday: TimeSlot[];
    tuesday: TimeSlot[];
    wednesday: TimeSlot[];
    thursday: TimeSlot[];
    friday: TimeSlot[];
    saturday: TimeSlot[];
    sunday: TimeSlot[];
  };
  
  // Pricing
  pricing_model: 'hourly' | 'fixed' | 'custom';
  hourly_rate?: number;
  
  // Status
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  verified: boolean;
  verified_at?: string;
  
  // Ownership
  owner_id: string;
  team_members: string[];
  
  // Meta
  created_at: string;
  updated_at: string;
}

export type BusinessType =
  | 'general_contractor'
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'roofing'
  | 'landscaping'
  | 'cleaning'
  | 'painting'
  | 'carpentry'
  | 'pest_control'
  | 'appliance_repair'
  | 'locksmith'
  | 'other';

export interface ServiceOffering {
  id: string;
  name: string;
  category: string;
  description: string;
  estimated_duration_hours: number;
  base_price?: number;
  requires_inspection: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  number: string;
  issued_date: string;
  expiry_date?: string;
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "17:00"
}

/**
 * Work Request System
 */
export interface WorkRequest {
  id: string;
  request_number: string; // e.g., "WR-2024-001234"
  
  // Request Details
  title: string;
  description: string;
  service_type: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  urgency_level: number; // 1-10
  
  // Customer Information
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  
  // Location
  location: {
    address: string;
    city: string;
    state: string;
    zip: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Scheduling
  preferred_date?: string;
  preferred_time?: string;
  flexible_scheduling: boolean;
  
  // Media
  photos: string[];
  documents: string[];
  
  // AI Analysis
  ai_analysis?: AIAnalysis;
  
  // Matching
  suggested_providers: SuggestedProvider[];
  assigned_provider?: string;
  
  // Status Tracking
  status: WorkRequestStatus;
  status_history: StatusUpdate[];
  
  // Financial
  estimated_cost?: number;
  quoted_cost?: number;
  final_cost?: number;
  
  // Meta
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export type WorkRequestStatus =
  | 'submitted'
  | 'analyzing'
  | 'matched'
  | 'quote_sent'
  | 'quote_accepted'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface StatusUpdate {
  status: WorkRequestStatus;
  timestamp: string;
  notes?: string;
  updated_by: string;
}

/**
 * AI Analysis System
 */
export interface AIAnalysis {
  confidence_score: number; // 0-100
  analysis_timestamp: string;
  
  // Service Classification
  detected_service_type: string;
  detected_category: string;
  complexity_level: 'simple' | 'moderate' | 'complex';
  
  // Requirements
  estimated_duration_hours: number;
  required_skills: string[];
  required_equipment: string[];
  required_certifications: string[];
  
  // Timing
  urgency_assessment: {
    level: 'low' | 'medium' | 'high' | 'urgent';
    reasoning: string;
  };
  
  // Cost Estimation
  estimated_cost_range: {
    min: number;
    max: number;
    confidence: number;
  };
  
  // Special Considerations
  requires_permit: boolean;
  requires_inspection: boolean;
  safety_concerns: string[];
  weather_dependent: boolean;
  
  // Extracted Information
  extracted_data: {
    property_type?: string;
    area_size?: number;
    materials_needed?: string[];
    problem_description?: string;
  };
}

/**
 * Provider Matching System
 */
export interface SuggestedProvider {
  business_id: string;
  business_name: string;
  match_score: number; // 0-100
  
  // Matching Factors
  matching_details: {
    location_score: number;
    service_match_score: number;
    availability_score: number;
    rating_score: number;
    experience_score: number;
    pricing_score: number;
  };
  
  // Provider Info
  distance_miles: number;
  average_rating: number;
  completed_jobs: number;
  response_time_hours: number;
  estimated_cost?: number;
  
  // Availability
  available: boolean;
  next_available_slot?: string;
  
  // Recommendation
  recommended: boolean;
  recommendation_reason: string;
}

export interface MatchingCriteria {
  // Location
  max_distance_miles: number;
  prefer_local: boolean;
  
  // Service
  required_services: string[];
  preferred_specializations: string[];
  
  // Quality
  min_rating: number;
  min_completed_jobs: number;
  verified_only: boolean;
  
  // Availability
  required_start_date?: string;
  max_response_time_hours?: number;
  
  // Cost
  budget_min?: number;
  budget_max?: number;
  
  // Preferences
  prefer_highly_rated: boolean;
  prefer_quick_response: boolean;
  prefer_experienced: boolean;
}

/**
 * AI Matching Algorithm Configuration
 */
export interface MatchingWeights {
  location: number;      // 0-1
  service_match: number; // 0-1
  availability: number;  // 0-1
  rating: number;        // 0-1
  experience: number;    // 0-1
  pricing: number;       // 0-1
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  location: 0.25,
  service_match: 0.30,
  availability: 0.15,
  rating: 0.15,
  experience: 0.10,
  pricing: 0.05,
};

/**
 * Work Request Number Generation
 */
export function generateWorkRequestNumber(timestamp: Date = new Date()): string {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `WR-${year}${month}${day}-${random}`;
}

/**
 * Distance Calculation (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * AI Matching Score Calculator
 */
export function calculateMatchScore(
  business: BusinessProfile,
  workRequest: WorkRequest,
  weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS
): number {
  let totalScore = 0;
  
  // Location Score (based on distance)
  if (business.address.coordinates && workRequest.location.coordinates) {
    const distance = calculateDistance(
      business.address.coordinates.lat,
      business.address.coordinates.lng,
      workRequest.location.coordinates.lat,
      workRequest.location.coordinates.lng
    );
    const locationScore = Math.max(0, 100 - (distance / business.service_radius_miles) * 100);
    totalScore += locationScore * weights.location;
  }
  
  // Service Match Score
  const serviceMatch = business.services.some(
    s => s.category === workRequest.category
  );
  const serviceScore = serviceMatch ? 100 : 0;
  totalScore += serviceScore * weights.service_match;
  
  // Availability Score (simplified - check if business is active)
  const availabilityScore = business.status === 'active' ? 100 : 0;
  totalScore += availabilityScore * weights.availability;
  
  // Rating Score
  const ratingScore = (business.metrics.average_rating / 5) * 100;
  totalScore += ratingScore * weights.rating;
  
  // Experience Score (based on completed jobs)
  const experienceScore = Math.min(100, business.metrics.total_jobs_completed / 10);
  totalScore += experienceScore * weights.experience;
  
  // Pricing Score (inverse - lower is better, but simplified here)
  const pricingScore = 80; // Default middle score
  totalScore += pricingScore * weights.pricing;
  
  return Math.round(totalScore);
}
