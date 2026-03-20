import { Implicant } from '@/types/logic';

/**
 * Prime Implicant Chart Logic
 * Implements the covering problem for selecting minimum implicants
 */

export function buildImplicantChart(
  primeImplicants: Implicant[],
  requiredTerms: number[]
): boolean[][] {
  // Chart[implicant index][minterm index] = true if implicant covers minterm
  return primeImplicants.map(imp => 
    requiredTerms.map(term => imp.minterms.includes(term))
  );
}

export function selectEssentialImplicants(
  chart: boolean[][],
  primeImplicants: Implicant[],
  requiredTerms: number[]
): { essential: Implicant[]; selected: Implicant[] } {
  const essential: Implicant[] = [];
  const covered = new Set<number>();

  // Find essential prime implicants
  // An implicant is essential if it's the only one covering some minterm
  requiredTerms.forEach((term, termIdx) => {
    const coveringImplicants: number[] = [];
    chart.forEach((row, impIdx) => {
      if (row[termIdx]) {
        coveringImplicants.push(impIdx);
      }
    });

    if (coveringImplicants.length === 1) {
      const impIdx = coveringImplicants[0];
      const imp = primeImplicants[impIdx];
      
      if (!essential.includes(imp)) {
        essential.push(imp);
        imp.minterms.forEach(m => {
          const idx = requiredTerms.indexOf(m);
          if (idx !== -1) covered.add(idx);
        });
      }
    }
  });

  // Check if all terms are covered
  const uncoveredTerms = requiredTerms.filter((_, idx) => !covered.has(idx));

  if (uncoveredTerms.length === 0) {
    return { essential, selected: essential };
  }

  // Use greedy approach to cover remaining terms
  const selected = [...essential];
  const remainingTerms = new Set(uncoveredTerms.map((_, i) => 
    requiredTerms.indexOf(uncoveredTerms[i])
  ));

  while (remainingTerms.size > 0) {
    // Find the implicant that covers the most uncovered terms
    let bestImp: Implicant | null = null;
    let bestCount = 0;
    let bestIdx = -1;

    primeImplicants.forEach((imp, impIdx) => {
      if (selected.includes(imp)) return;

      const coverCount = [...remainingTerms].filter(termIdx => 
        chart[impIdx][termIdx]
      ).length;

      if (coverCount > bestCount) {
        bestCount = coverCount;
        bestImp = imp;
        bestIdx = impIdx;
      }
    });

    if (bestImp && bestIdx !== -1) {
      selected.push(bestImp);
      chart[bestIdx].forEach((covers, termIdx) => {
        if (covers) remainingTerms.delete(termIdx);
      });
    } else {
      break; // No progress possible
    }
  }

  return { essential, selected };
}

export function formatImplicantChart(
  chart: boolean[][],
  primeImplicants: Implicant[],
  requiredTerms: number[],
  variableLabels: string[]
): string {
  const header = ['Implicant', ...requiredTerms.map(m => `m${m}`)];
  const rows = primeImplicants.map((imp, idx) => {
    const term = describeTerm(imp.binary, variableLabels);
    const coverage = chart[idx].map(c => c ? '✓' : '');
    return [term, ...coverage];
  });

  return [header, ...rows].map(row => row.join('\t')).join('\n');
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
