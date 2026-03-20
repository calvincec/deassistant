import { CanonicalForm, Implicant, KMapGroup, KMapStep, SolverResult, OutputFormat } from '@/types/logic';
import { mintermToBinary, countOnes } from '../normalize/inputNormalizer';
import { findAllGroups, mergeOverlappingGroups } from './kmapGrouping';
import { generateKMapSteps } from './kmapVisualizer';

/**
 * K-Map Solver
 * Implements visual K-map simplification with step-by-step explanation
 */

export function solveKMap(
  canonical: CanonicalForm,
  outputFormat: OutputFormat
): SolverResult {
  const { minterms, dontCares, variableCount, variableLabels } = canonical;
  
  if (outputFormat === 'POS') {
    // For POS, we work with maxterms (0s in the K-map)
    return solveKMapPOS(canonical);
  }

  // SOP: Find groups covering all 1s
  const allOnes = [...minterms, ...dontCares];
  
  // Find all possible groups (powers of 2)
  const groups = findAllGroups(allOnes, variableCount);
  
  // Select minimum cover
  const { selectedGroups, primeImplicants, essentialImplicants } = selectMinimumCover(
    groups,
    minterms,
    variableCount
  );

  // Generate expression
  const expression = generateSOPExpression(essentialImplicants, variableLabels);

  // Generate visual steps
  const steps = generateKMapSteps(
    canonical,
    selectedGroups,
    primeImplicants,
    essentialImplicants
  );

  return {
    expression,
    implicants: primeImplicants,
    essentialImplicants,
    steps,
  };
}

function solveKMapPOS(canonical: CanonicalForm): SolverResult {
  const { maxterms, dontCares, variableCount, variableLabels, minterms } = canonical;
  
  // For POS, work with maxterms (0s)
  const allZeros = [...maxterms, ...dontCares];
  
  const groups = findAllGroups(allZeros, variableCount);
  
  const { selectedGroups, primeImplicants, essentialImplicants } = selectMinimumCover(
    groups,
    maxterms,
    variableCount
  );

  const expression = generatePOSExpression(essentialImplicants, variableLabels);

  const steps = generateKMapSteps(
    canonical,
    selectedGroups,
    primeImplicants,
    essentialImplicants
  );

  return {
    expression,
    implicants: primeImplicants,
    essentialImplicants,
    steps,
  };
}

function selectMinimumCover(
  groups: KMapGroup[],
  requiredTerms: number[],
  variableCount: number
): { selectedGroups: KMapGroup[]; primeImplicants: Implicant[]; essentialImplicants: Implicant[] } {
  // Find prime implicants (groups that can't be combined further)
  const primeImplicants: Implicant[] = [];
  const mergedGroups = mergeOverlappingGroups(groups, variableCount);
  
  mergedGroups.forEach((group, index) => {
    const binary = groupToBinary(group.cells, variableCount);
    primeImplicants.push({
      minterms: group.cells,
      binary,
      isEssential: false,
      isPrime: true,
    });
    group.color = (index % 6) + 1;
  });

  // Find essential prime implicants
  const essentialImplicants: Implicant[] = [];
  const covered = new Set<number>();
  
  requiredTerms.forEach(term => {
    const coveringGroups = mergedGroups.filter(g => g.cells.includes(term));
    if (coveringGroups.length === 1) {
      const group = coveringGroups[0];
      const implicant = primeImplicants.find(p => 
        p.minterms.length === group.cells.length &&
        p.minterms.every(m => group.cells.includes(m))
      );
      if (implicant && !essentialImplicants.includes(implicant)) {
        implicant.isEssential = true;
        essentialImplicants.push(implicant);
        group.cells.forEach(c => covered.add(c));
      }
    }
  });

  // Cover remaining terms with smallest groups
  const uncovered = requiredTerms.filter(t => !covered.has(t));
  const additionalImplicants: Implicant[] = [];
  
  for (const term of uncovered) {
    if (covered.has(term)) continue;
    
    const coveringGroups = mergedGroups
      .filter(g => g.cells.includes(term))
      .sort((a, b) => b.cells.length - a.cells.length); // Prefer larger groups
    
    if (coveringGroups.length > 0) {
      const group = coveringGroups[0];
      const implicant = primeImplicants.find(p => 
        p.minterms.length === group.cells.length &&
        p.minterms.every(m => group.cells.includes(m))
      );
      if (implicant && !essentialImplicants.includes(implicant) && !additionalImplicants.includes(implicant)) {
        additionalImplicants.push(implicant);
        group.cells.forEach(c => covered.add(c));
      }
    }
  }

  return {
    selectedGroups: mergedGroups.filter(g => {
      const implicant = [...essentialImplicants, ...additionalImplicants].find(p =>
        p.minterms.length === g.cells.length &&
        p.minterms.every(m => g.cells.includes(m))
      );
      return implicant !== undefined;
    }),
    primeImplicants,
    essentialImplicants: [...essentialImplicants, ...additionalImplicants],
  };
}

function groupToBinary(cells: number[], variableCount: number): string {
  // Find the common bits among all cells
  const binaries = cells.map(c => mintermToBinary(c, variableCount));
  let result = '';
  
  for (let i = 0; i < variableCount; i++) {
    const bits = binaries.map(b => b[i]);
    const allSame = bits.every(b => b === bits[0]);
    result += allSame ? bits[0] : '-';
  }
  
  return result;
}

function generateSOPExpression(implicants: Implicant[], labels: string[]): string {
  if (implicants.length === 0) return '0';
  
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

  // Check for tautology
  if (terms.includes('1')) return '1';
  
  return terms.join(' + ');
}

function generatePOSExpression(implicants: Implicant[], labels: string[]): string {
  if (implicants.length === 0) return '1';
  
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

  // Check for contradiction
  if (terms.includes('0')) return '0';
  
  return terms.join(' · ');
}
