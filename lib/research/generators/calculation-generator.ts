// Calculation Generation
// Maps questions to project calculations and complexity factors

import { Question, Calculation } from '../types/interfaces';

export class CalculationGenerator {

  /**
   * Generates calculations dynamically based on questions
   */
  generateCalculationsFromQuestions(questions: Question[]): Calculation[] {
    // Generate calculations dynamically based on the actual questions generated
    const calculations = questions.map((question: Question, index: number) => {
      // Determine the type of calculation based on question content
      let value: number | string = "1.0";
      let unit = "multiplier";
      let source = `Derived from: ${question.text}`;
      
      // Analyze the question to determine the best calculation value
      const questionText = question.text.toLowerCase();
      
      if (questionText.includes('timeline') || 
          questionText.includes('deadline') ||
          questionText.includes('rush') ||
          questionText.includes('urgent')) {
        value = "1.3";
        unit = "multiplier";
        source = `Timeline pressure factor - adjusts hours based on urgency requirements`;
      } else if (questionText.includes('compliance') || 
                 questionText.includes('regulation') ||
                 questionText.includes('audit') ||
                 questionText.includes('security')) {
        value = "40";
        unit = "hours";
        source = `Compliance overhead - adds additional hours for regulatory requirements`;
      } else if (questionText.includes('size') || 
                 questionText.includes('users') ||
                 questionText.includes('scale') ||
                 questionText.includes('environment')) {
        value = "1.5";
        unit = "multiplier";
        source = `Scale factor - adjusts hours based on project size and scope`;
      } else if (questionText.includes('complexity') || 
                 questionText.includes('rules') ||
                 questionText.includes('migration') ||
                 questionText.includes('integration')) {
        value = "1.4";
        unit = "multiplier";
        source = `Complexity factor - adjusts hours based on technical complexity`;
      } else if (questionText.includes('experience') ||
                 questionText.includes('expertise') ||
                 questionText.includes('knowledge')) {
        value = "1.2";
        unit = "multiplier";
        source = `Experience factor - adjusts hours based on team experience level`;
      } else {
        value = "1.1";
        unit = "multiplier";
        source = `General project factor based on: ${question.text.replace('?', '')}`;
      }

      return {
        name: `${question.text.replace('?', '')} Factor`,
        value: value,
        unit: unit,
        source: source
      };
    });

    // Add base calculations if we don't have many questions
    if (calculations.length < 3) {
      calculations.push({
        name: "Base Implementation Complexity",
        value: "1.2",
        unit: "multiplier",
        source: "Standard complexity factor for implementation projects - accounts for unforeseen challenges and integration complexities"
      });
    }

    // Add a project coordination factor
    calculations.push({
      name: "Project Coordination Overhead",
      value: "0.15",
      unit: "percentage",
      source: "Standard project management and coordination overhead - includes meetings, documentation, and communication"
    });

    console.log(`✅ Generated ${calculations.length} calculations mapped to actual questions`);
    return calculations;
  }

  /**
   * Calculates total project hours based on services and calculations
   */
  calculateTotalHours(services: any[], calculations: Calculation[]): number {
    let baseHours = services.reduce((total, service) => total + (service.hours || 0), 0);
    
    // Apply multiplier calculations
    calculations.forEach(calc => {
      if (calc.unit === "multiplier" && typeof calc.value === "string") {
        const multiplier = parseFloat(calc.value);
        if (!isNaN(multiplier)) {
          baseHours *= multiplier;
        }
      } else if (calc.unit === "hours" && typeof calc.value === "string") {
        const additionalHours = parseFloat(calc.value);
        if (!isNaN(additionalHours)) {
          baseHours += additionalHours;
        }
      } else if (calc.unit === "percentage" && typeof calc.value === "string") {
        const percentage = parseFloat(calc.value);
        if (!isNaN(percentage)) {
          baseHours *= (1 + percentage);
        }
      }
    });

    return Math.round(baseHours);
  }
}

// Singleton instance
let calculationGeneratorInstance: CalculationGenerator | null = null;

export function getCalculationGenerator(): CalculationGenerator {
  if (!calculationGeneratorInstance) {
    calculationGeneratorInstance = new CalculationGenerator();
  }
  return calculationGeneratorInstance;
}