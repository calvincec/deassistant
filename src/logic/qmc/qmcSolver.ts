import { CanonicalForm, Implicant, OutputFormat, QMCStep, SolverResult } from '@/types/logic';
import { generateQMCSteps } from './qmcSteps';
import { buildImplicantChart, selectEssentialImplicants } from './implicantChart';
import { mintermToBinary, countOnes } from '../normalize/inputNormalizer';

/**
 * Quine-McCluskey Algorithm Solver
 * Implements tabular minimization with step-by-step visualization
 */

export function solveQMC(
  canonical: CanonicalForm,
  outputFormat: OutputFormat
): SolverResult {
  const { minterms, dontCares, variableCount, variableLabels } = canonical;

  if (outputFormat === 'POS') {
    return solveQMCPOS(canonical);
  }

  // Step 1: Group minterms by number of 1s
  const allTerms = [...minterms, ...dontCares];
  const groups = groupByOnes(allTerms, variableCount);

  // Step 2: Iteratively combine adjacent groups
  const { primeImplicants, combinationSteps } = findPrimeImplicants(groups, variableCount);

  // Step 3: Build prime implicant chart
  const chart = buildImplicantChart(primeImplicants, minterms);

  // Step 4: Select essential prime implicants
  const { essential, selected } = selectEssentialImplicants(chart, primeImplicants, minterms);

  // Mark essential implicants
  essential.forEach(imp => {
    imp.isEssential = true;
  });

  // Generate expression
  const expression = generateExpression(selected, variableLabels, 'SOP');

  // Generate steps
  const steps = generateQMCSteps(
    groups,
    combinationSteps,
    primeImplicants,
    chart,
    essential,
    selected,
    minterms,
    variableLabels
  );

  return {
    expression,
    implicants: primeImplicants,
    essentialImplicants: selected,
    steps,
  };
}

function solveQMCPOS(canonical: CanonicalForm): SolverResult {
  const { maxterms, dontCares, variableCount, variableLabels, minterms } = canonical;

  // For POS, we work with maxterms
  const allTerms = [...maxterms, ...dontCares];
  const groups = groupByOnes(allTerms, variableCount);

  const { primeImplicants, combinationSteps } = findPrimeImplicants(groups, variableCount);
  const chart = buildImplicantChart(primeImplicants, maxterms);
  const { essential, selected } = selectEssentialImplicants(chart, primeImplicants, maxterms);

  essential.forEach(imp => {
    imp.isEssential = true;
  });

  const expression = generateExpression(selected, variableLabels, 'POS');

  const steps = generateQMCSteps(
    groups,
    combinationSteps,
    primeImplicants,
    chart,
    essential,
    selected,
    maxterms,
    variableLabels
  );

  return {
    expression,
    implicants: primeImplicants,
    essentialImplicants: selected,
    steps,
  };
}

interface TermEntry {
  binary: string;
  minterms: number[];
  used: boolean;
}

function groupByOnes(terms: number[], variableCount: number): Map<number, TermEntry[]> {
  const groups = new Map<number, TermEntry[]>();

  terms.forEach(term => {
    const binary = mintermToBinary(term, variableCount);
    const ones = countOnes(binary);
    
    if (!groups.has(ones)) {
      groups.set(ones, []);
    }
    
    groups.get(ones)!.push({
      binary,
      minterms: [term],
      used: false,
    });
  });

  return groups;
}

interface CombinationStep {
  iteration: number;
  pairs: { a: string; b: string; result: string; combined: number[] }[];
}

function findPrimeImplicants(
  initialGroups: Map<number, TermEntry[]>,
  variableCount: number
): { primeImplicants: Implicant[]; combinationSteps: CombinationStep[] } {
  const combinationSteps: CombinationStep[] = [];
  let currentGroups = initialGroups;
  let iteration = 1;
  let hasChanges = true;

  while (hasChanges) {
    hasChanges = false;
    const newGroups = new Map<number, TermEntry[]>();
    const stepPairs: CombinationStep['pairs'] = [];

    const sortedKeys = [...currentGroups.keys()].sort((a, b) => a - b);

    for (let i = 0; i < sortedKeys.length - 1; i++) {
      const group1 = currentGroups.get(sortedKeys[i]) || [];
      const group2 = currentGroups.get(sortedKeys[i] + 1) || [];

      for (const term1 of group1) {
        for (const term2 of group2) {
          const combined = combineTerms(term1.binary, term2.binary);
          
          if (combined !== null) {
            hasChanges = true;
            term1.used = true;
            term2.used = true;

            const combinedMinterms = [...term1.minterms, ...term2.minterms].sort((a, b) => a - b);
            const ones = countOnes(combined.replace(/-/g, ''));

            if (!newGroups.has(ones)) {
              newGroups.set(ones, []);
            }

            // Avoid duplicates
            const existing = newGroups.get(ones)!;
            const isDuplicate = existing.some(e => 
              e.binary === combined &&
              e.minterms.length === combinedMinterms.length &&
              e.minterms.every((m, idx) => m === combinedMinterms[idx])
            );

            if (!isDuplicate) {
              existing.push({
                binary: combined,
                minterms: combinedMinterms,
                used: false,
              });

              stepPairs.push({
                a: term1.binary,
                b: term2.binary,
                result: combined,
                combined: combinedMinterms,
              });
            }
          }
        }
      }
    }

    if (stepPairs.length > 0) {
      combinationSteps.push({ iteration, pairs: stepPairs });
    }

    currentGroups = newGroups;
    iteration++;
  }

  // Collect prime implicants (unused terms from all iterations)
  const primeImplicants: Implicant[] = [];
  const seen = new Set<string>();

  const collectUnused = (groups: Map<number, TermEntry[]>) => {
    groups.forEach(entries => {
      entries.forEach(entry => {
        if (!entry.used) {
          const key = `${entry.binary}-${entry.minterms.join(',')}`;
          if (!seen.has(key)) {
            seen.add(key);
            primeImplicants.push({
              binary: entry.binary,
              minterms: entry.minterms,
              isPrime: true,
              isEssential: false,
            });
          }
        }
      });
    });
  };

  collectUnused(initialGroups);
  
  return { primeImplicants, combinationSteps };
}

function combineTerms(a: string, b: string): string | null {
  let diffCount = 0;
  let diffPosition = -1;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      diffCount++;
      diffPosition = i;
    }
    if (diffCount > 1) return null;
  }
  
  if (diffCount !== 1) return null;
  
  return a.substring(0, diffPosition) + '-' + a.substring(diffPosition + 1);
}

function generateExpression(
  implicants: Implicant[],
  labels: string[],
  format: OutputFormat
): string {
  if (implicants.length === 0) return format === 'SOP' ? '0' : '1';

  if (format === 'SOP') {
    const terms = implicants.map(imp => {
      let term = '';
      for (let i = 0; i < imp.binary.length; i++) {
        if (imp.binary[i] === '1') {
          term += labels[i];
        } else if (imp.binary[i] === '0') {
          term += labels[i] + "'";
        }
      }
      return term || '1';
    });

    if (terms.includes('1')) return '1';
    return terms.join(' + ');
  } else {
    const terms = implicants.map(imp => {
      const literals: string[] = [];
      for (let i = 0; i < imp.binary.length; i++) {
        if (imp.binary[i] === '0') {
          literals.push(labels[i]);
        } else if (imp.binary[i] === '1') {
          literals.push(labels[i] + "'");
        }
      }
      return literals.length > 0 ? `(${literals.join(' + ')})` : '0';
    });

    if (terms.includes('0')) return '0';
    return terms.join(' · ');
  }
}
