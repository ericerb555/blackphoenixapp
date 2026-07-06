/**
 * App Store Content Validator
 * Ensures compliance with Apple App Store Review Guidelines
 * 
 * Compliance: Apple App Store Review Guidelines 4.0+
 * Reference: https://developer.apple.com/app-store/review/guidelines/
 */

export interface ContentValidation {
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
  suggestedRating: string;
  guideline: string;
  timestamp: string;
}

export interface AppStoreMetadata {
  appName: string;
  description: string;
  keywords: string[];
  version: string;
  minimumAge: number;
}

/**
 * Validate content for Apple App Store compliance
 */
export function validateAppStoreContent(content: string): ContentValidation {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check for prohibited content
  checkProhibitedContent(content, violations);
  
  // Check for misleading content
  checkMisleadingContent(content, warnings);
  
  // Check for explicit language
  const hasExplicitLanguage = checkExplicitLanguage(content);
  
  // Check for age-appropriate content
  checkAgeAppropriate(content, warnings);

  // Determine suggested rating
  const suggestedRating = determineSuggestedRating(hasExplicitLanguage, violations.length);

  return {
    isCompliant: violations.length === 0,
    violations,
    warnings,
    suggestedRating,
    guideline: 'Apple App Store Review Guidelines',
    timestamp: new Date().toISOString()
  };
}

/**
 * Check for prohibited content
 * Reference: Guidelines 1.1, 1.2, 5.1
 */
function checkProhibitedContent(content: string, violations: string[]): void {
  const prohibited = [
    // Adult content
    {
      pattern: /\b(porn|pornography|xxx|adult content|nsfw)\b/i,
      rule: '1.1.4 - Adult or pornographic content prohibited',
      severity: 'critical'
    },
    // Illegal activities
    {
      pattern: /\b(hack|crack|pirate|torrent|warez|keygen)\b/i,
      rule: '2.3.2 - References to illegal activity prohibited',
      severity: 'critical'
    },
    // Drug references
    {
      pattern: /\b(marijuana|cannabis|cocaine|heroin|meth)\b/i,
      rule: '1.4.3 - Drug-related content prohibited',
      severity: 'high'
    },
    // Weapons/violence promotion
    {
      pattern: /\b(buy guns|sell weapons|make bomb)\b/i,
      rule: '1.4.1 - Weapons and violence promotion prohibited',
      severity: 'critical'
    },
    // Misleading monetization
    {
      pattern: /\b(unlimited coins|free gems|hack|cheat|generator)\b/i,
      rule: '3.1.1 - Misleading in-app purchase content',
      severity: 'high'
    }
  ];

  prohibited.forEach(({ pattern, rule, severity }) => {
    if (pattern.test(content)) {
      violations.push(`[${severity.toUpperCase()}] ${rule}`);
    }
  });
}

/**
 * Check for misleading content
 * Reference: Guidelines 2.3, 5.1
 */
function checkMisleadingContent(content: string, warnings: string[]): void {
  const misleading = [
    {
      pattern: /\b(guaranteed|100% success|never fails|instant results)\b/i,
      message: '2.3.1 - Avoid absolute guarantees or misleading claims'
    },
    {
      pattern: /\b(free trial)\b/i,
      message: '3.1.2 - Clearly disclose free trial terms and auto-renewal'
    },
    {
      pattern: /\b(download now|click here|limited time)\b/i,
      message: '2.3.7 - Avoid aggressive or deceptive marketing language'
    }
  ];

  misleading.forEach(({ pattern, message }) => {
    if (pattern.test(content)) {
      warnings.push(message);
    }
  });
}

/**
 * Check for explicit language
 * Reference: Guideline 1.2
 */
function checkExplicitLanguage(content: string): boolean {
  const explicitWords = /\b(fuck|shit|damn|ass|bitch|hell)\b/i;
  return explicitWords.test(content);
}

/**
 * Check age-appropriate content
 */
function checkAgeAppropriate(content: string, warnings: string[]): void {
  // Check for mature themes
  const matureThemes = /\b(violence|blood|gore|death|kill)\b/i;
  if (matureThemes.test(content)) {
    warnings.push('Content may require 12+ or 17+ age rating due to mature themes');
  }

  // Check for gambling references
  const gambling = /\b(casino|poker|slots|betting|wager)\b/i;
  if (gambling.test(content)) {
    warnings.push('Gambling content requires 17+ age rating and compliance with local laws');
  }
}

/**
 * Determine suggested age rating
 */
function determineSuggestedRating(hasExplicitLanguage: boolean, violationCount: number): string {
  if (violationCount > 0) return 'REJECTION LIKELY';
  if (hasExplicitLanguage) return '12+';
  return '4+';
}

/**
 * Validate app metadata
 */
export function validateAppMetadata(metadata: AppStoreMetadata): ContentValidation {
  const violations: string[] = [];
  const warnings: string[] = [];

  // App name validation (max 30 characters)
  if (metadata.appName.length > 30) {
    violations.push('App name exceeds 30 characters');
  }

  // Description validation (max 4000 characters)
  if (metadata.description.length > 4000) {
    violations.push('App description exceeds 4000 characters');
  }

  // Keywords validation (max 100 characters, comma-separated)
  const keywordsString = metadata.keywords.join(',');
  if (keywordsString.length > 100) {
    violations.push('Keywords exceed 100 characters total');
  }

  // Version validation (format: X.X.X)
  const versionRegex = /^\d+\.\d+(\.\d+)?$/;
  if (!versionRegex.test(metadata.version)) {
    violations.push('Version must follow format X.X or X.X.X');
  }

  // Age rating validation
  const validAges = [4, 9, 12, 17];
  if (!validAges.includes(metadata.minimumAge)) {
    violations.push('Minimum age must be 4+, 9+, 12+, or 17+');
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    warnings,
    suggestedRating: `${metadata.minimumAge}+`,
    guideline: 'Apple App Store Review Guidelines',
    timestamp: new Date().toISOString()
  };
}

/**
 * Check privacy compliance
 * Reference: Guidelines 5.1
 */
export function checkPrivacyCompliance(hasPrivacyPolicy: boolean, collectsData: boolean): ContentValidation {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (collectsData && !hasPrivacyPolicy) {
    violations.push('5.1.1 - Privacy policy required if app collects user data');
  }

  if (!hasPrivacyPolicy) {
    warnings.push('Best practice: Include privacy policy even if not collecting data');
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    warnings,
    suggestedRating: '4+',
    guideline: 'Apple App Store Review Guidelines - Privacy',
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(validations: ContentValidation[]): string {
  const totalChecks = validations.length;
  const compliantChecks = validations.filter(v => v.isCompliant).length;
  const totalViolations = validations.reduce((sum, v) => sum + v.violations.length, 0);
  const totalWarnings = validations.reduce((sum, v) => sum + v.warnings.length, 0);

  let report = `\n${'='.repeat(60)}\n`;
  report += `  APP STORE COMPLIANCE REPORT\n`;
  report += `${'='.repeat(60)}\n\n`;
  report += `Total Checks: ${totalChecks}\n`;
  report += `Compliant: ${compliantChecks}/${totalChecks}\n`;
  report += `Violations: ${totalViolations}\n`;
  report += `Warnings: ${totalWarnings}\n\n`;

  if (totalViolations === 0) {
    report += `✅ READY FOR APP STORE SUBMISSION\n`;
  } else {
    report += `❌ FIXES REQUIRED BEFORE SUBMISSION\n`;
  }

  report += `\n${'='.repeat(60)}\n`;
  return report;
}
