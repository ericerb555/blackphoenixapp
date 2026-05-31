/**
 * AI Company Matching Service
 * Analyzes quote details and suggests the best company to handle it
 */

export interface CompanySuggestion {
  companyId: string;
  companyName: string;
  confidence: number; // 0-100
  matchScore: number; // 0-100
  reasons: string[];
  capabilities: string[];
  pastPerformance?: {
    similarProjects: number;
    successRate: number;
    averageRating: number;
  };
  availability?: 'immediate' | 'within-week' | 'within-month' | 'limited';
  estimatedStartDate?: string;
}

interface CompanyProfile {
  id: string;
  name: string;
  specialties: string[];
  services: string[];
  expertise: string[];
  certifications: string[];
  teamSize: number;
  location: string;
  serviceArea: string[];
  ratings: {
    quality: number;
    timeliness: number;
    communication: number;
    value: number;
  };
  completedProjects: number;
  averageProjectSize: string; // 'small' | 'medium' | 'large' | 'enterprise'
}

class AICompanyMatchingService {
  private companiesKey = 'invoice_companies'; // Reuse from invoicing

  // Analyze quote and suggest best company
  async analyzeAndSuggest(quoteDetails: {
    category: string;
    description: string;
    budget?: number;
    urgency: string;
    location?: string;
    specialRequirements?: string;
    estimatedDuration?: string;
  }): Promise<CompanySuggestion[]> {
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const companies = this.getCompanyProfiles();
    const suggestions: CompanySuggestion[] = [];
    
    for (const company of companies) {
      const analysis = this.analyzeCompanyMatch(company, quoteDetails);
      if (analysis.matchScore >= 60) { // Only suggest if 60%+ match
        suggestions.push(analysis);
      }
    }
    
    // Sort by confidence score
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    return suggestions;
  }

  // Analyze individual company match
  private analyzeCompanyMatch(
    company: CompanyProfile,
    quoteDetails: any
  ): CompanySuggestion {
    const reasons: string[] = [];
    const capabilities: string[] = [];
    let matchScore = 0;
    let confidence = 0;
    
    // Category matching
    const category = quoteDetails.category.toLowerCase();
    const description = quoteDetails.description.toLowerCase();
    
    // Check specialties match
    const specialtyMatch = company.specialties.some(s => 
      category.includes(s.toLowerCase()) || description.includes(s.toLowerCase())
    );
    if (specialtyMatch) {
      matchScore += 30;
      confidence += 25;
      reasons.push(`Specializes in ${company.specialties.join(', ')}`);
    }
    
    // Check service offerings
    const serviceMatch = company.services.some(s => 
      category.includes(s.toLowerCase()) || description.includes(s.toLowerCase())
    );
    if (serviceMatch) {
      matchScore += 20;
      confidence += 15;
      reasons.push('Offers this exact service');
    }
    
    // Budget compatibility
    if (quoteDetails.budget) {
      const budgetRange = this.estimateBudgetRange(quoteDetails.budget);
      if (company.averageProjectSize === budgetRange) {
        matchScore += 15;
        confidence += 10;
        reasons.push('Project size aligns with typical work');
      }
    }
    
    // Urgency handling
    if (quoteDetails.urgency === 'urgent' || quoteDetails.urgency === 'high') {
      if (company.teamSize > 10) {
        matchScore += 10;
        confidence += 10;
        reasons.push('Large team can handle urgent projects');
      }
    }
    
    // Quality ratings
    const avgRating = (
      company.ratings.quality +
      company.ratings.timeliness +
      company.ratings.communication +
      company.ratings.value
    ) / 4;
    
    if (avgRating >= 4.5) {
      matchScore += 15;
      confidence += 15;
      reasons.push('Excellent track record (4.5+ stars)');
    } else if (avgRating >= 4.0) {
      matchScore += 10;
      confidence += 10;
      reasons.push('Strong track record (4.0+ stars)');
    }
    
    // Experience level
    if (company.completedProjects > 100) {
      matchScore += 10;
      confidence += 10;
      reasons.push(`${company.completedProjects}+ completed projects`);
    }
    
    // Certifications
    if (company.certifications.length > 0) {
      matchScore += 5;
      confidence += 5;
      capabilities.push(...company.certifications);
    }
    
    // Expertise areas
    capabilities.push(...company.expertise);
    
    // Determine availability
    const availability = this.determineAvailability(company, quoteDetails.urgency);
    
    return {
      companyId: company.id,
      companyName: company.name,
      confidence: Math.min(confidence, 100),
      matchScore: Math.min(matchScore, 100),
      reasons: reasons.slice(0, 5), // Top 5 reasons
      capabilities: capabilities.slice(0, 8),
      pastPerformance: {
        similarProjects: this.estimateSimilarProjects(company, quoteDetails.category),
        successRate: this.calculateSuccessRate(company),
        averageRating: avgRating
      },
      availability,
      estimatedStartDate: this.estimateStartDate(availability)
    };
  }

  // Get company profiles
  private getCompanyProfiles(): CompanyProfile[] {
    // Get companies from invoicing service
    const companiesData = localStorage.getItem(this.companiesKey);
    const companies = companiesData ? JSON.parse(companiesData) : [];
    
    // Enhance with profile data
    return companies.map((company: any, index: number) => {
      // Different profiles for each company
      const profiles = [
        {
          specialties: ['Renovations', 'Remodeling', 'Construction'],
          services: ['Kitchen Remodeling', 'Bathroom Renovation', 'Room Additions', 'Deck Building'],
          expertise: ['Residential', 'Commercial', 'Custom Work'],
          certifications: ['Licensed General Contractor', 'EPA Lead-Safe Certified', 'OSHA 30'],
          teamSize: 15,
          location: 'Metro Area',
          serviceArea: ['City Center', 'North Side', 'East Side', 'Suburbs'],
          ratings: { quality: 4.8, timeliness: 4.6, communication: 4.7, value: 4.5 },
          completedProjects: 245,
          averageProjectSize: 'medium'
        },
        {
          specialties: ['Electrical', 'HVAC', 'Plumbing'],
          services: ['Electrical Installation', 'HVAC Repair', 'Plumbing Services', 'Emergency Services'],
          expertise: ['Residential', 'Commercial', '24/7 Service'],
          certifications: ['Master Electrician', 'HVAC Certified', 'Licensed Plumber'],
          teamSize: 25,
          location: 'Metro Area',
          serviceArea: ['City Center', 'North Side', 'South Side', 'West Side'],
          ratings: { quality: 4.9, timeliness: 4.8, communication: 4.9, value: 4.7 },
          completedProjects: 580,
          averageProjectSize: 'small'
        },
        {
          specialties: ['Custom Homes', 'Luxury Renovations', 'High-End Finishes'],
          services: ['Custom Home Building', 'Luxury Remodeling', 'Architectural Services', 'Interior Design'],
          expertise: ['High-End Residential', 'Commercial', 'Design-Build'],
          certifications: ['LEED Certified', 'NARI Member', 'CGR Certified'],
          teamSize: 40,
          location: 'Metro Area',
          serviceArea: ['City Center', 'Suburbs', 'Surrounding Counties'],
          ratings: { quality: 5.0, timeliness: 4.9, communication: 5.0, value: 4.6 },
          completedProjects: 120,
          averageProjectSize: 'large'
        }
      ];
      
      return {
        id: company.id,
        name: company.name,
        ...profiles[index % profiles.length]
      };
    });
  }

  // Helper functions
  private estimateBudgetRange(budget: number): string {
    if (budget < 5000) return 'small';
    if (budget < 50000) return 'medium';
    if (budget < 250000) return 'large';
    return 'enterprise';
  }

  private determineAvailability(company: CompanyProfile, urgency: string): CompanySuggestion['availability'] {
    if (company.teamSize > 30) return 'immediate';
    if (company.teamSize > 15) return 'within-week';
    if (urgency === 'urgent') return 'limited';
    return 'within-month';
  }

  private estimateStartDate(availability: CompanySuggestion['availability']): string {
    const today = new Date();
    let daysToAdd = 0;
    
    switch (availability) {
      case 'immediate':
        daysToAdd = 2;
        break;
      case 'within-week':
        daysToAdd = 5;
        break;
      case 'within-month':
        daysToAdd = 14;
        break;
      case 'limited':
        daysToAdd = 21;
        break;
    }
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + daysToAdd);
    return startDate.toISOString().split('T')[0];
  }

  private estimateSimilarProjects(company: CompanyProfile, category: string): number {
    const matchingSpecialty = company.specialties.some(s => 
      category.toLowerCase().includes(s.toLowerCase())
    );
    
    if (matchingSpecialty) {
      return Math.floor(company.completedProjects * 0.6);
    }
    return Math.floor(company.completedProjects * 0.2);
  }

  private calculateSuccessRate(company: CompanyProfile): number {
    const avgRating = (
      company.ratings.quality +
      company.ratings.timeliness +
      company.ratings.communication +
      company.ratings.value
    ) / 4;
    
    return Math.min((avgRating / 5) * 100, 100);
  }
}

export const aiCompanyMatchingService = new AICompanyMatchingService();
