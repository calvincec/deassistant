import { CanonicalForm, Implicant, KMapGroup, KMapStep } from '@/types/logic';

/**
 * Generates visual step-by-step explanation for K-map solving
 */

export function generateKMapSteps(
  canonical: CanonicalForm,
  selectedGroups: KMapGroup[],
  primeImplicants: Implicant[],
  essentialImplicants: Implicant[]
): KMapStep[] {
  const steps: KMapStep[] = [];
  const { minterms, dontCares, variableCount } = canonical;

  // Step 1: Initial K-map
  steps.push({
    title: 'Initial K-Map',
    description: `The K-map is filled with the function values. Cells marked with 1 represent minterms (${minterms.join(', ') || 'none'}), cells marked with X represent don't-cares (${dontCares.join(', ') || 'none'}), and cells with 0 represent maxterms.`,
    groups: [],
    highlightedCells: [...minterms, ...dontCares],
  });

  // Step 2: Identify possible groups
  if (selectedGroups.length > 0) {
    steps.push({
      title: 'Identify Groups',
      description: `Look for rectangular groups of 1s and Xs with sizes that are powers of 2 (1, 2, 4, 8, 16). Larger groups lead to simpler terms. Groups can wrap around edges.`,
      groups: selectedGroups.map((g, i) => ({ ...g, color: (i % 6) + 1 })),
      highlightedCells: [],
    });
  }

  // Step 3: Show each group individually
  selectedGroups.forEach((group, index) => {
    const groupColor = (index % 6) + 1;
    const groupImplicant = primeImplicants.find(p => 
      p.minterms.length === group.cells.length &&
      p.minterms.every(m => group.cells.includes(m))
    );

    if (groupImplicant) {
      const termDescription = describeTerm(groupImplicant.binary, canonical.variableLabels);
      steps.push({
        title: `Group ${index + 1}: ${termDescription}`,
        description: `This group covers minterms {${group.cells.join(', ')}}. The binary pattern is "${groupImplicant.binary}" where "-" indicates the variable is eliminated.`,
        groups: [{ ...group, color: groupColor }],
        highlightedCells: group.cells,
      });
    }
  });

  // Step 4: Prime Implicants
  if (primeImplicants.length > 0) {
    const primeList = primeImplicants.map((p, i) => 
      `P${i + 1}: ${describeTerm(p.binary, canonical.variableLabels)} (covers {${p.minterms.join(', ')}})`
    ).join('\n');

    steps.push({
      title: 'Prime Implicants',
      description: `Prime implicants are groups that cannot be combined into larger groups:\n${primeList}`,
      groups: selectedGroups,
      highlightedCells: [],
    });
  }

  // Step 5: Essential Prime Implicants
  if (essentialImplicants.length > 0) {
    const essentialList = essentialImplicants.map((p, i) => 
      describeTerm(p.binary, canonical.variableLabels)
    ).join(', ');

    steps.push({
      title: 'Essential Prime Implicants',
      description: `Essential prime implicants are those that uniquely cover at least one minterm. These must be included in the final expression: ${essentialList}`,
      groups: selectedGroups.filter(g => 
        essentialImplicants.some(e => 
          e.minterms.length === g.cells.length &&
          e.minterms.every(m => g.cells.includes(m))
        )
      ),
      highlightedCells: essentialImplicants.flatMap(e => e.minterms),
    });
  }

  // Step 6: Final Expression
  const finalExpr = essentialImplicants.map(e => 
    describeTerm(e.binary, canonical.variableLabels)
  ).join(' + ') || '0';

  steps.push({
    title: 'Simplified Expression',
    description: `The minimized SOP expression is: F = ${finalExpr}`,
    groups: selectedGroups.filter(g => 
      essentialImplicants.some(e => 
        e.minterms.length === g.cells.length &&
        e.minterms.every(m => g.cells.includes(m))
      )
    ),
    highlightedCells: [],
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
