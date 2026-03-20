import { Implicant, QMCStep, QMCStepData } from '@/types/logic';

/**
 * Generates step-by-step visualization data for QMC algorithm
 */

interface TermEntry {
  binary: string;
  minterms: number[];
  used: boolean;
}

interface CombinationStep {
  iteration: number;
  pairs: { a: string; b: string; result: string; combined: number[] }[];
}

export function generateQMCSteps(
  initialGroups: Map<number, TermEntry[]>,
  combinationSteps: CombinationStep[],
  primeImplicants: Implicant[],
  chart: boolean[][],
  essential: Implicant[],
  selected: Implicant[],
  requiredTerms: number[],
  variableLabels: string[]
): QMCStep[] {
  const steps: QMCStep[] = [];

  // Step 1: Initial grouping by number of 1s
  const groupingData: Record<number, { binary: string; minterms: number[] }[]> = {};
  initialGroups.forEach((entries, ones) => {
    groupingData[ones] = entries.map(e => ({
      binary: e.binary,
      minterms: e.minterms,
    }));
  });

  steps.push({
    title: 'Step 1: Group by Number of 1s',
    description: 'The minterms are grouped according to the number of 1s in their binary representation. This allows us to identify terms that differ by exactly one bit (adjacent groups can potentially be combined).',
    data: { type: 'grouping', groups: groupingData },
  });

  // Step 2: Show combination iterations
  combinationSteps.forEach((step, index) => {
    steps.push({
      title: `Step 2.${index + 1}: Combination Round ${step.iteration}`,
      description: `Terms from adjacent groups (differing by one 1) are compared. If they differ in exactly one bit position, they can be combined by replacing that position with a dash (-), indicating the variable is eliminated.`,
      data: { type: 'combination', pairs: step.pairs },
    });
  });

  // Step 3: Prime Implicants
  steps.push({
    title: 'Step 3: Identify Prime Implicants',
    description: 'Terms that cannot be combined further are called prime implicants. These represent the simplest possible product terms that cover the function.',
    data: { type: 'primeImplicants', implicants: primeImplicants },
  });

  // Step 4: Prime Implicant Chart
  steps.push({
    title: 'Step 4: Prime Implicant Chart',
    description: 'The chart shows which minterms are covered by each prime implicant. A mark (✓) indicates coverage.',
    data: { 
      type: 'chart', 
      chart, 
      minterms: requiredTerms,
      implicants: primeImplicants,
    },
  });

  // Step 5: Essential Prime Implicants
  const remaining = requiredTerms.filter(m => 
    !essential.some(e => e.minterms.includes(m))
  );

  steps.push({
    title: 'Step 5: Select Essential Prime Implicants',
    description: 'Essential prime implicants are those that uniquely cover at least one minterm (columns with only one ✓). These must be included in the final solution.',
    data: { 
      type: 'essential', 
      essential,
      remaining,
    },
  });

  // Step 6: Final Expression
  const expression = selected.map(imp => 
    describeTerm(imp.binary, variableLabels)
  ).join(' + ') || '0';

  steps.push({
    title: 'Step 6: Minimized Expression',
    description: `The final simplified expression combines all selected implicants.`,
    data: { type: 'final', expression },
  });

  return steps;
}

function describeTerm(binary: string, labels: string[]): string {
  let term = '';
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      term += labels[i];
    } else if (binary[i] === '0') {
      term += labels[i] + "'";
    }
  }
  return term || '1';
}
