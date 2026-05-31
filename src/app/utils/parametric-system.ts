/**
 * Parametric & Constraint-Based Modeling System
 * Enables editable parameters with automatic constraint satisfaction
 */

export type ConstraintType = 
  | 'parallel' 
  | 'perpendicular' 
  | 'fixed-distance' 
  | 'fixed-angle' 
  | 'horizontal' 
  | 'vertical'
  | 'equal-length'
  | 'midpoint'
  | 'tangent';

export interface Constraint {
  id: string;
  type: ConstraintType;
  elementIds: string[]; // IDs of elements involved in constraint
  value?: number; // For distance/angle constraints
  isActive: boolean;
  priority: number; // Higher priority constraints solved first
}

export interface Parameter {
  id: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
  unit: 'ft' | 'm' | 'in' | 'mm' | 'deg';
  isEditable: boolean;
  elementId: string; // Element this parameter belongs to
  propertyPath: string; // e.g., "length", "width", "angle"
}

export interface ParametricElement {
  id: string;
  type: string;
  parameters: Parameter[];
  constraints: string[]; // IDs of constraints affecting this element
  computedProperties: Record<string, any>;
}

/**
 * Constraint Solver - Uses iterative relaxation method
 */
export class ConstraintSolver {
  private maxIterations = 100;
  private tolerance = 0.001;

  /**
   * Solve all constraints for a set of elements
   */
  solve(elements: ParametricElement[], constraints: Constraint[]): ParametricElement[] {
    const activeConstraints = constraints
      .filter(c => c.isActive)
      .sort((a, b) => b.priority - a.priority);

    let iterations = 0;
    let converged = false;
    let updatedElements = [...elements];

    while (!converged && iterations < this.maxIterations) {
      let totalError = 0;
      const previousElements = JSON.parse(JSON.stringify(updatedElements));

      for (const constraint of activeConstraints) {
        const result = this.applyConstraint(constraint, updatedElements);
        updatedElements = result.elements;
        totalError += result.error;
      }

      // Check for convergence
      converged = totalError < this.tolerance;
      
      // Check if elements changed significantly
      const maxChange = this.calculateMaxChange(previousElements, updatedElements);
      if (maxChange < this.tolerance) {
        converged = true;
      }

      iterations++;
    }

    console.log(`Constraint solver: ${converged ? 'converged' : 'max iterations'} after ${iterations} iterations`);
    return updatedElements;
  }

  /**
   * Apply a single constraint
   */
  private applyConstraint(
    constraint: Constraint, 
    elements: ParametricElement[]
  ): { elements: ParametricElement[]; error: number } {
    switch (constraint.type) {
      case 'parallel':
        return this.applyParallelConstraint(constraint, elements);
      case 'perpendicular':
        return this.applyPerpendicularConstraint(constraint, elements);
      case 'fixed-distance':
        return this.applyFixedDistanceConstraint(constraint, elements);
      case 'fixed-angle':
        return this.applyFixedAngleConstraint(constraint, elements);
      case 'horizontal':
        return this.applyHorizontalConstraint(constraint, elements);
      case 'vertical':
        return this.applyVerticalConstraint(constraint, elements);
      case 'equal-length':
        return this.applyEqualLengthConstraint(constraint, elements);
      default:
        return { elements, error: 0 };
    }
  }

  private applyParallelConstraint(constraint: Constraint, elements: ParametricElement[]) {
    // Get two wall elements
    const [el1, el2] = constraint.elementIds.map(id => elements.find(e => e.id === id));
    if (!el1 || !el2) return { elements, error: 0 };

    // Calculate angles and make them equal
    const angle1 = this.getElementAngle(el1);
    const angle2 = this.getElementAngle(el2);
    const angleDiff = angle2 - angle1;
    
    // Adjust second element to match first
    const updatedElements = elements.map(el => {
      if (el.id === el2.id) {
        return this.rotateElement(el, -angleDiff);
      }
      return el;
    });

    return { elements: updatedElements, error: Math.abs(angleDiff) };
  }

  private applyPerpendicularConstraint(constraint: Constraint, elements: ParametricElement[]) {
    const [el1, el2] = constraint.elementIds.map(id => elements.find(e => e.id === id));
    if (!el1 || !el2) return { elements, error: 0 };

    const angle1 = this.getElementAngle(el1);
    const angle2 = this.getElementAngle(el2);
    const targetAngle = angle1 + Math.PI / 2;
    const angleDiff = angle2 - targetAngle;

    const updatedElements = elements.map(el => {
      if (el.id === el2.id) {
        return this.rotateElement(el, -angleDiff);
      }
      return el;
    });

    return { elements: updatedElements, error: Math.abs(angleDiff) };
  }

  private applyFixedDistanceConstraint(constraint: Constraint, elements: ParametricElement[]) {
    const [el1, el2] = constraint.elementIds.map(id => elements.find(e => e.id === id));
    if (!el1 || !el2 || constraint.value === undefined) return { elements, error: 0 };

    const currentDistance = this.calculateDistance(el1, el2);
    const targetDistance = constraint.value;
    const error = currentDistance - targetDistance;

    if (Math.abs(error) < this.tolerance) return { elements, error: 0 };

    // Move el2 to maintain target distance
    const scaleFactor = targetDistance / currentDistance;
    const updatedElements = elements.map(el => {
      if (el.id === el2.id) {
        return this.scaleElement(el, scaleFactor);
      }
      return el;
    });

    return { elements: updatedElements, error: Math.abs(error) };
  }

  private applyFixedAngleConstraint(constraint: Constraint, elements: ParametricElement[]) {
    const el = elements.find(e => e.id === constraint.elementIds[0]);
    if (!el || constraint.value === undefined) return { elements, error: 0 };

    const currentAngle = this.getElementAngle(el);
    const targetAngle = constraint.value * (Math.PI / 180); // Convert to radians
    const angleDiff = targetAngle - currentAngle;

    const updatedElements = elements.map(e => {
      if (e.id === el.id) {
        return this.rotateElement(e, angleDiff);
      }
      return e;
    });

    return { elements: updatedElements, error: Math.abs(angleDiff) };
  }

  private applyHorizontalConstraint(constraint: Constraint, elements: ParametricElement[]) {
    const el = elements.find(e => e.id === constraint.elementIds[0]);
    if (!el) return { elements, error: 0 };

    const currentAngle = this.getElementAngle(el);
    const angleDiff = -currentAngle; // Make angle = 0 (horizontal)

    const updatedElements = elements.map(e => {
      if (e.id === el.id) {
        return this.rotateElement(e, angleDiff);
      }
      return e;
    });

    return { elements: updatedElements, error: Math.abs(angleDiff) };
  }

  private applyVerticalConstraint(constraint: Constraint, elements: ParametricElement[]) {
    const el = elements.find(e => e.id === constraint.elementIds[0]);
    if (!el) return { elements, error: 0 };

    const currentAngle = this.getElementAngle(el);
    const targetAngle = Math.PI / 2; // 90 degrees
    const angleDiff = targetAngle - currentAngle;

    const updatedElements = elements.map(e => {
      if (e.id === el.id) {
        return this.rotateElement(e, angleDiff);
      }
      return e;
    });

    return { elements: updatedElements, error: Math.abs(angleDiff) };
  }

  private applyEqualLengthConstraint(constraint: Constraint, elements: ParametricElement[]) {
    const constraintElements = constraint.elementIds.map(id => elements.find(e => e.id === id));
    if (constraintElements.some(el => !el)) return { elements, error: 0 };

    const lengths = constraintElements.map(el => this.getElementLength(el!));
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const error = lengths.reduce((sum, len) => sum + Math.abs(len - avgLength), 0);

    const updatedElements = elements.map(el => {
      if (constraint.elementIds.includes(el.id)) {
        const currentLength = this.getElementLength(el);
        const scaleFactor = avgLength / currentLength;
        return this.scaleElement(el, scaleFactor);
      }
      return el;
    });

    return { elements: updatedElements, error };
  }

  // Helper methods
  private getElementAngle(element: ParametricElement): number {
    const angleParam = element.parameters.find(p => p.propertyPath === 'angle');
    return angleParam ? angleParam.value * (Math.PI / 180) : 0;
  }

  private getElementLength(element: ParametricElement): number {
    const lengthParam = element.parameters.find(p => p.propertyPath === 'length');
    return lengthParam ? lengthParam.value : 0;
  }

  private calculateDistance(el1: ParametricElement, el2: ParametricElement): number {
    // Simplified - assumes elements have x, y positions
    const x1 = el1.computedProperties.x || 0;
    const y1 = el1.computedProperties.y || 0;
    const x2 = el2.computedProperties.x || 0;
    const y2 = el2.computedProperties.y || 0;
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  private rotateElement(element: ParametricElement, angleDelta: number): ParametricElement {
    const angleParam = element.parameters.find(p => p.propertyPath === 'angle');
    if (angleParam) {
      const newAngle = (angleParam.value + angleDelta * (180 / Math.PI)) % 360;
      return {
        ...element,
        parameters: element.parameters.map(p => 
          p.propertyPath === 'angle' ? { ...p, value: newAngle } : p
        ),
      };
    }
    return element;
  }

  private scaleElement(element: ParametricElement, scaleFactor: number): ParametricElement {
    return {
      ...element,
      parameters: element.parameters.map(p => {
        if (p.propertyPath === 'length' || p.propertyPath === 'width' || p.propertyPath === 'height') {
          return { ...p, value: p.value * scaleFactor };
        }
        return p;
      }),
    };
  }

  private calculateMaxChange(oldElements: ParametricElement[], newElements: ParametricElement[]): number {
    let maxChange = 0;
    for (let i = 0; i < oldElements.length; i++) {
      const oldParams = oldElements[i].parameters;
      const newParams = newElements[i].parameters;
      for (let j = 0; j < oldParams.length; j++) {
        const change = Math.abs(newParams[j].value - oldParams[j].value);
        maxChange = Math.max(maxChange, change);
      }
    }
    return maxChange;
  }
}

/**
 * Convert regular element to parametric element
 */
export function elementToParametric(element: any): ParametricElement {
  const parameters: Parameter[] = [];
  
  if (element.type === 'wall') {
    const dx = element.x2 - element.x1;
    const dy = element.y2 - element.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    parameters.push({
      id: `${element.id}-length`,
      name: 'Length',
      value: length,
      min: 10,
      unit: 'ft',
      isEditable: true,
      elementId: element.id || `el-${Date.now()}`,
      propertyPath: 'length',
    });
    
    parameters.push({
      id: `${element.id}-angle`,
      name: 'Angle',
      value: angle,
      min: -180,
      max: 180,
      unit: 'deg',
      isEditable: true,
      elementId: element.id || `el-${Date.now()}`,
      propertyPath: 'angle',
    });
  }
  
  return {
    id: element.id || `el-${Date.now()}`,
    type: element.type,
    parameters,
    constraints: [],
    computedProperties: {
      x: element.x1 || element.x,
      y: element.y1 || element.y,
      x2: element.x2,
      y2: element.y2,
    },
  };
}

/**
 * Convert parametric element back to regular element
 */
export function parametricToElement(parametric: ParametricElement): any {
  const base: any = {
    id: parametric.id,
    type: parametric.type,
  };
  
  if (parametric.type === 'wall') {
    const lengthParam = parametric.parameters.find(p => p.propertyPath === 'length');
    const angleParam = parametric.parameters.find(p => p.propertyPath === 'angle');
    
    const length = lengthParam?.value || 0;
    const angle = ((angleParam?.value || 0) * Math.PI) / 180;
    
    const x1 = parametric.computedProperties.x || 0;
    const y1 = parametric.computedProperties.y || 0;
    
    base.x1 = x1;
    base.y1 = y1;
    base.x2 = x1 + length * Math.cos(angle);
    base.y2 = y1 + length * Math.sin(angle);
  }
  
  return base;
}

/**
 * Create a constraint between elements
 */
export function createConstraint(
  type: ConstraintType,
  elementIds: string[],
  value?: number,
  priority: number = 1
): Constraint {
  return {
    id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    elementIds,
    value,
    isActive: true,
    priority,
  };
}
