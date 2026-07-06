/**
 * Component Size Validator
 * Ensures all components stay under 250 lines for maintainability
 * MANDATORY: Run before commit
 * 
 * Compliance: Modular Architecture Standards
 */

export interface ComponentMetrics {
  path: string;
  lines: number;
  complexity: number;
  isCompliant: boolean;
  violations: string[];
  grade: 'A' | 'B' | 'C' | 'F';
}

export const COMPONENT_RULES = {
  maxLines: 250,
  maxComplexity: 15,
  maxFunctionLength: 50,
  maxNesting: 4,
  warningThreshold: 200
};

/**
 * Validates component file size and complexity
 */
export function validateComponentSize(filePath: string, content: string): ComponentMetrics {
  const lines = content.split('\n').length;
  const complexity = calculateComplexity(content);
  const violations: string[] = [];

  // Line count check
  if (lines > COMPONENT_RULES.maxLines) {
    violations.push(`Component exceeds ${COMPONENT_RULES.maxLines} lines (${lines} lines) - REFACTOR REQUIRED`);
  } else if (lines > COMPONENT_RULES.warningThreshold) {
    violations.push(`Component approaching size limit (${lines} lines) - Consider splitting`);
  }

  // Complexity check
  if (complexity > COMPONENT_RULES.maxComplexity) {
    violations.push(`Cyclomatic complexity too high (${complexity}) - Maximum: ${COMPONENT_RULES.maxComplexity}`);
  }

  // Function length check
  const longFunctions = findLongFunctions(content);
  if (longFunctions.length > 0) {
    violations.push(`${longFunctions.length} function(s) exceed ${COMPONENT_RULES.maxFunctionLength} lines`);
  }

  const isCompliant = violations.length === 0;
  const grade = calculateGrade(lines, complexity, violations.length);

  return {
    path: filePath,
    lines,
    complexity,
    isCompliant,
    violations,
    grade
  };
}

/**
 * Calculate cyclomatic complexity
 * Counts: if, else, for, while, switch, &&, ||, ?, catch
 */
function calculateComplexity(content: string): number {
  const patterns = /\b(if|else|for|while|switch|catch|&&|\|\||\?)\b/g;
  return (content.match(patterns) || []).length;
}

/**
 * Find functions that exceed max length
 */
function findLongFunctions(content: string): string[] {
  const functionRegex = /function\s+(\w+)|const\s+(\w+)\s*=\s*\(/g;
  const lines = content.split('\n');
  const longFunctions: string[] = [];
  
  // Simple heuristic: count lines between function declarations
  let currentFunctionStart = -1;
  let currentFunctionName = '';
  
  lines.forEach((line, index) => {
    const match = functionRegex.exec(line);
    if (match) {
      if (currentFunctionStart !== -1) {
        const length = index - currentFunctionStart;
        if (length > COMPONENT_RULES.maxFunctionLength) {
          longFunctions.push(currentFunctionName);
        }
      }
      currentFunctionName = match[1] || match[2] || 'anonymous';
      currentFunctionStart = index;
    }
  });
  
  return longFunctions;
}

/**
 * Calculate compliance grade
 */
function calculateGrade(lines: number, complexity: number, violationCount: number): 'A' | 'B' | 'C' | 'F' {
  if (violationCount === 0 && lines < 200 && complexity < 10) return 'A';
  if (violationCount <= 1 && lines < 230) return 'B';
  if (violationCount <= 2 && lines <= 250) return 'C';
  return 'F';
}

/**
 * Batch validate multiple files
 */
export function validateMultipleComponents(files: Array<{ path: string; content: string }>): ComponentMetrics[] {
  return files.map(file => validateComponentSize(file.path, file.content));
}

/**
 * Generate validation report
 */
export function generateReport(metrics: ComponentMetrics[]): string {
  const totalFiles = metrics.length;
  const compliantFiles = metrics.filter(m => m.isCompliant).length;
  const gradeDistribution = {
    A: metrics.filter(m => m.grade === 'A').length,
    B: metrics.filter(m => m.grade === 'B').length,
    C: metrics.filter(m => m.grade === 'C').length,
    F: metrics.filter(m => m.grade === 'F').length
  };

  let report = `\n${'='.repeat(60)}\n`;
  report += `  COMPONENT SIZE VALIDATION REPORT\n`;
  report += `${'='.repeat(60)}\n\n`;
  report += `Total Files: ${totalFiles}\n`;
  report += `Compliant: ${compliantFiles} (${Math.round(compliantFiles / totalFiles * 100)}%)\n\n`;
  report += `Grade Distribution:\n`;
  report += `  A: ${gradeDistribution.A} files (Excellent)\n`;
  report += `  B: ${gradeDistribution.B} files (Good)\n`;
  report += `  C: ${gradeDistribution.C} files (Needs Improvement)\n`;
  report += `  F: ${gradeDistribution.F} files (REFACTOR REQUIRED)\n\n`;

  metrics.forEach(metric => {
    report += `\n${metric.path}\n`;
    report += `  Lines: ${metric.lines}/${COMPONENT_RULES.maxLines}\n`;
    report += `  Complexity: ${metric.complexity}/${COMPONENT_RULES.maxComplexity}\n`;
    report += `  Grade: ${metric.grade}\n`;
    if (metric.violations.length > 0) {
      report += `  Violations:\n`;
      metric.violations.forEach(v => report += `    - ${v}\n`);
    }
  });

  report += `\n${'='.repeat(60)}\n`;
  return report;
}
