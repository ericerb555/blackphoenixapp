import {
  BusinessProfile,
  WorkRequest,
  AIAnalysis,
  SuggestedProvider,
  MatchingCriteria,
  MatchingWeights,
  DEFAULT_MATCHING_WEIGHTS,
  calculateDistance,
  calculateMatchScore,
} from '../types/multi-business.types';

/**
 * AI-Powered Service Provider Matching Engine
 * Analyzes work requests and suggests the best service providers
 */

export class AIMatchingEngine {
  /**
   * Analyze work request and extract key information
   */
  static async analyzeWorkRequest(workRequest: WorkRequest): Promise<AIAnalysis> {
    // In production, this would call your AI service (OpenAI, custom model, etc.)
    // For now, we'll simulate AI analysis based on keywords and patterns
    
    const description = workRequest.description.toLowerCase();
    const title = workRequest.title.toLowerCase();
    const fullText = `${title} ${description}`;
    
    // Detect service type and complexity
    const serviceDetection = this.detectServiceType(fullText);
    const complexityLevel = this.assessComplexity(fullText, workRequest);
    const urgencyAssessment = this.assessUrgency(fullText, workRequest);
    const costEstimate = this.estimateCost(serviceDetection.category, complexityLevel);
    const requiredSkills = this.extractRequiredSkills(fullText, serviceDetection.category);
    
    return {
      confidence_score: serviceDetection.confidence,
      analysis_timestamp: new Date().toISOString(),
      
      detected_service_type: serviceDetection.type,
      detected_category: serviceDetection.category,
      complexity_level: complexityLevel,
      
      estimated_duration_hours: this.estimateDuration(complexityLevel, serviceDetection.category),
      required_skills: requiredSkills,
      required_equipment: this.getRequiredEquipment(serviceDetection.category),
      required_certifications: this.getRequiredCertifications(serviceDetection.category),
      
      urgency_assessment: urgencyAssessment,
      
      estimated_cost_range: costEstimate,
      
      requires_permit: this.requiresPermit(serviceDetection.category),
      requires_inspection: this.requiresInspection(serviceDetection.category),
      safety_concerns: this.identifySafetyConcerns(fullText, serviceDetection.category),
      weather_dependent: this.isWeatherDependent(serviceDetection.category),
      
      extracted_data: this.extractStructuredData(fullText),
    };
  }

  /**
   * Match work request with suitable service providers
   */
  static async matchProviders(
    workRequest: WorkRequest,
    allBusinesses: BusinessProfile[],
    criteria: MatchingCriteria,
    weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS
  ): Promise<SuggestedProvider[]> {
    const suggestions: SuggestedProvider[] = [];
    
    for (const business of allBusinesses) {
      // Filter out inactive or suspended businesses
      if (business.status !== 'active') continue;
      
      // Check if business offers required service
      const offersService = business.services.some(
        s => s.category === workRequest.category || 
             criteria.required_services.includes(s.name)
      );
      if (!offersService) continue;
      
      // Check verification requirement
      if (criteria.verified_only && !business.verified) continue;
      
      // Calculate distance if coordinates available
      let distance = 0;
      if (business.address.coordinates && workRequest.location.coordinates) {
        distance = calculateDistance(
          business.address.coordinates.lat,
          business.address.coordinates.lng,
          workRequest.location.coordinates.lat,
          workRequest.location.coordinates.lng
        );
        
        // Skip if outside service area
        if (distance > business.service_radius_miles) continue;
        if (distance > criteria.max_distance_miles) continue;
      }
      
      // Check minimum rating
      if (business.metrics.average_rating < criteria.min_rating) continue;
      
      // Check minimum completed jobs
      if (business.metrics.total_jobs_completed < criteria.min_completed_jobs) continue;
      
      // Calculate match score
      const matchScore = calculateMatchScore(business, workRequest, weights);
      
      // Calculate individual factor scores
      const locationScore = distance > 0
        ? Math.max(0, 100 - (distance / business.service_radius_miles) * 100)
        : 100;
      
      const serviceMatchScore = business.services.filter(
        s => s.category === workRequest.category
      ).length > 0 ? 100 : 50;
      
      const availabilityScore = business.status === 'active' ? 100 : 0;
      const ratingScore = (business.metrics.average_rating / 5) * 100;
      const experienceScore = Math.min(100, (business.metrics.total_jobs_completed / 100) * 100);
      const pricingScore = this.calculatePricingScore(business, criteria);
      
      // Estimate cost for this provider
      const estimatedCost = this.estimateProviderCost(
        business,
        workRequest.ai_analysis?.estimated_cost_range
      );
      
      // Determine if recommended (top scoring providers)
      const recommended = matchScore >= 80;
      
      suggestions.push({
        business_id: business.id,
        business_name: business.name,
        match_score: matchScore,
        matching_details: {
          location_score: Math.round(locationScore),
          service_match_score: Math.round(serviceMatchScore),
          availability_score: Math.round(availabilityScore),
          rating_score: Math.round(ratingScore),
          experience_score: Math.round(experienceScore),
          pricing_score: Math.round(pricingScore),
        },
        distance_miles: Math.round(distance * 10) / 10,
        average_rating: business.metrics.average_rating,
        completed_jobs: business.metrics.total_jobs_completed,
        response_time_hours: business.metrics.response_time_hours,
        estimated_cost: estimatedCost,
        available: business.status === 'active',
        next_available_slot: this.getNextAvailableSlot(business),
        recommended,
        recommendation_reason: this.generateRecommendationReason(
          matchScore,
          {
            locationScore,
            ratingScore,
            experienceScore,
            distance,
          }
        ),
      });
    }
    
    // Sort by match score (descending)
    suggestions.sort((a, b) => b.match_score - a.match_score);
    
    return suggestions;
  }

  // Private helper methods
  
  private static detectServiceType(text: string): {
    type: string;
    category: string;
    confidence: number;
  } {
    const patterns: Record<string, { keywords: string[]; category: string }> = {
      hvac: {
        keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'ac repair', 'furnace', 'thermostat'],
        category: 'hvac',
      },
      plumbing: {
        keywords: ['plumbing', 'leak', 'pipe', 'drain', 'faucet', 'toilet', 'water heater', 'clog'],
        category: 'plumbing',
      },
      electrical: {
        keywords: ['electrical', 'wiring', 'outlet', 'circuit', 'breaker', 'light', 'switch', 'power'],
        category: 'electrical',
      },
      roofing: {
        keywords: ['roof', 'shingle', 'gutter', 'leak', 'repair roof', 'roof replacement'],
        category: 'roofing',
      },
      landscaping: {
        keywords: ['lawn', 'grass', 'tree', 'garden', 'landscaping', 'mowing', 'trimming'],
        category: 'landscaping',
      },
      cleaning: {
        keywords: ['cleaning', 'clean', 'maid', 'housekeeping', 'janitorial'],
        category: 'cleaning',
      },
      painting: {
        keywords: ['paint', 'painting', 'interior paint', 'exterior paint', 'repaint'],
        category: 'painting',
      },
    };
    
    let bestMatch = { type: 'general', category: 'general_contractor', confidence: 50 };
    let maxMatches = 0;
    
    for (const [type, { keywords, category }] of Object.entries(patterns)) {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = {
          type,
          category,
          confidence: Math.min(95, 50 + matches * 15),
        };
      }
    }
    
    return bestMatch;
  }

  private static assessComplexity(text: string, workRequest: WorkRequest): 'simple' | 'moderate' | 'complex' {
    let complexityScore = 0;
    
    // Length-based complexity
    if (text.length > 500) complexityScore += 2;
    else if (text.length > 200) complexityScore += 1;
    
    // Keywords indicating complexity
    const complexKeywords = ['multiple', 'entire', 'whole house', 'complete', 'major', 'extensive'];
    const moderateKeywords = ['several', 'few', 'some', 'partial'];
    
    complexKeywords.forEach(keyword => {
      if (text.includes(keyword)) complexityScore += 2;
    });
    
    moderateKeywords.forEach(keyword => {
      if (text.includes(keyword)) complexityScore += 1;
    });
    
    // Priority-based complexity
    if (workRequest.priority === 'urgent') complexityScore += 1;
    
    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'simple';
  }

  private static assessUrgency(text: string, workRequest: WorkRequest): {
    level: 'low' | 'medium' | 'high' | 'urgent';
    reasoning: string;
  } {
    const urgentKeywords = ['emergency', 'urgent', 'asap', 'immediately', 'now', 'flooding'];
    const highKeywords = ['soon', 'quickly', 'this week', 'important'];
    
    const hasUrgent = urgentKeywords.some(keyword => text.includes(keyword));
    const hasHigh = highKeywords.some(keyword => text.includes(keyword));
    
    if (workRequest.priority === 'urgent' || hasUrgent) {
      return {
        level: 'urgent',
        reasoning: 'Customer indicated emergency or immediate attention required',
      };
    }
    
    if (workRequest.priority === 'high' || hasHigh) {
      return {
        level: 'high',
        reasoning: 'Time-sensitive request requiring prompt response',
      };
    }
    
    if (workRequest.priority === 'medium') {
      return {
        level: 'medium',
        reasoning: 'Standard service request with reasonable timeline',
      };
    }
    
    return {
      level: 'low',
      reasoning: 'Non-urgent request with flexible scheduling',
    };
  }

  private static estimateCost(category: string, complexity: string): {
    min: number;
    max: number;
    confidence: number;
  } {
    const baseCosts: Record<string, { min: number; max: number }> = {
      hvac: { min: 150, max: 5000 },
      plumbing: { min: 100, max: 3000 },
      electrical: { min: 100, max: 4000 },
      roofing: { min: 500, max: 15000 },
      landscaping: { min: 100, max: 5000 },
      cleaning: { min: 50, max: 500 },
      painting: { min: 200, max: 8000 },
      general_contractor: { min: 200, max: 10000 },
    };
    
    const base = baseCosts[category] || baseCosts.general_contractor;
    const multiplier = complexity === 'complex' ? 1.5 : complexity === 'moderate' ? 1.2 : 1.0;
    
    return {
      min: Math.round(base.min * multiplier),
      max: Math.round(base.max * multiplier),
      confidence: 70,
    };
  }

  private static estimateDuration(complexity: string, category: string): number {
    const baseDurations: Record<string, number> = {
      hvac: 4,
      plumbing: 3,
      electrical: 3,
      roofing: 8,
      landscaping: 6,
      cleaning: 4,
      painting: 8,
      general_contractor: 8,
    };
    
    const base = baseDurations[category] || 4;
    const multiplier = complexity === 'complex' ? 2 : complexity === 'moderate' ? 1.5 : 1.0;
    
    return Math.round(base * multiplier);
  }

  private static extractRequiredSkills(text: string, category: string): string[] {
    const skillSets: Record<string, string[]> = {
      hvac: ['HVAC Systems', 'Refrigeration', 'Ductwork', 'Climate Control'],
      plumbing: ['Pipe Installation', 'Leak Detection', 'Drain Cleaning', 'Water Systems'],
      electrical: ['Electrical Wiring', 'Circuit Installation', 'Safety Compliance', 'Troubleshooting'],
      roofing: ['Roof Installation', 'Leak Repair', 'Shingle Replacement', 'Waterproofing'],
      landscaping: ['Lawn Care', 'Plant Knowledge', 'Irrigation', 'Design'],
      cleaning: ['Deep Cleaning', 'Sanitization', 'Organization', 'Equipment Use'],
      painting: ['Surface Preparation', 'Paint Application', 'Color Matching', 'Finishing'],
    };
    
    return skillSets[category] || ['General Labor', 'Problem Solving', 'Customer Service'];
  }

  private static getRequiredEquipment(category: string): string[] {
    const equipment: Record<string, string[]> = {
      hvac: ['Diagnostic Tools', 'Refrigerant Recovery Machine', 'Gauges', 'Vacuum Pump'],
      plumbing: ['Pipe Wrench', 'Snake Auger', 'Leak Detector', 'Torch'],
      electrical: ['Multimeter', 'Wire Stripper', 'Cable Tester', 'Safety Gear'],
      roofing: ['Ladder', 'Safety Harness', 'Nail Gun', 'Roofing Materials'],
      landscaping: ['Mower', 'Trimmer', 'Blower', 'Hand Tools'],
      cleaning: ['Vacuum', 'Cleaning Solutions', 'Mop', 'Safety Equipment'],
      painting: ['Brushes', 'Rollers', 'Sprayer', 'Drop Cloths', 'Ladder'],
    };
    
    return equipment[category] || ['Basic Tools', 'Safety Equipment'];
  }

  private static getRequiredCertifications(category: string): string[] {
    const certs: Record<string, string[]> = {
      hvac: ['EPA 608 Certification', 'HVAC License'],
      plumbing: ['Plumbing License', 'Backflow Certification'],
      electrical: ['Electrician License', 'Electrical Code Certification'],
      roofing: ['Roofing License', 'OSHA Safety Certification'],
    };
    
    return certs[category] || [];
  }

  private static requiresPermit(category: string): boolean {
    return ['electrical', 'plumbing', 'roofing', 'general_contractor'].includes(category);
  }

  private static requiresInspection(category: string): boolean {
    return ['electrical', 'plumbing', 'roofing', 'hvac'].includes(category);
  }

  private static identifySafetyConcerns(text: string, category: string): string[] {
    const concerns: string[] = [];
    
    if (category === 'electrical') concerns.push('Electrical shock hazard', 'Fire risk');
    if (category === 'plumbing' && text.includes('gas')) concerns.push('Gas leak hazard');
    if (category === 'roofing') concerns.push('Fall hazard', 'Weather exposure');
    if (text.includes('asbestos')) concerns.push('Asbestos exposure');
    if (text.includes('mold')) concerns.push('Mold exposure');
    
    return concerns;
  }

  private static isWeatherDependent(category: string): boolean {
    return ['roofing', 'landscaping', 'painting'].includes(category);
  }

  private static extractStructuredData(text: string): any {
    const data: any = {};
    
    // Extract property type
    if (text.includes('house') || text.includes('home')) data.property_type = 'residential';
    if (text.includes('commercial') || text.includes('business')) data.property_type = 'commercial';
    if (text.includes('apartment')) data.property_type = 'apartment';
    
    // Extract area size (simplified pattern matching)
    const sizeMatch = text.match(/(\d+)\s*(sq\.?\s?ft|square feet)/i);
    if (sizeMatch) data.area_size = parseInt(sizeMatch[1]);
    
    return data;
  }

  private static calculatePricingScore(
    business: BusinessProfile,
    criteria: MatchingCriteria
  ): number {
    if (!business.hourly_rate || !criteria.budget_max) return 80;
    
    // Lower price = higher score (inverse relationship)
    const ratio = business.hourly_rate / criteria.budget_max;
    return Math.max(0, 100 - ratio * 50);
  }

  private static estimateProviderCost(
    business: BusinessProfile,
    costRange?: { min: number; max: number; confidence: number }
  ): number | undefined {
    if (!costRange || !business.hourly_rate) return undefined;
    
    // Use average of cost range as base, adjust by provider's rate
    const avgCost = (costRange.min + costRange.max) / 2;
    return Math.round(avgCost * 0.9); // 10% discount for estimation
  }

  private static getNextAvailableSlot(business: BusinessProfile): string | undefined {
    // Simplified - in production, check actual calendar
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  private static generateRecommendationReason(
    matchScore: number,
    factors: {
      locationScore: number;
      ratingScore: number;
      experienceScore: number;
      distance: number;
    }
  ): string {
    const reasons: string[] = [];
    
    if (factors.distance < 5) reasons.push('Very close to your location');
    else if (factors.distance < 15) reasons.push('Nearby location');
    
    if (factors.ratingScore > 90) reasons.push('Excellent customer ratings');
    else if (factors.ratingScore > 75) reasons.push('High customer satisfaction');
    
    if (factors.experienceScore > 80) reasons.push('Extensive experience');
    
    if (matchScore >= 90) reasons.push('Perfect match for your needs');
    else if (matchScore >= 80) reasons.push('Strong match for your requirements');
    
    return reasons.join('. ') || 'Good overall match';
  }
}
