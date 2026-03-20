import { CanonicalForm, CellValue, TruthTableRow } from '@/types/logic';

/**
 * Normalizes all input formats into a canonical form
 * The canonical form contains minterms, maxterms, and don't cares
 */

export function normalizeFromKMap(
  grid: CellValue[][],
  variableCount: number,
  variableLabels: string[]
): CanonicalForm {
  const minterms: number[] = [];
  const maxterms: number[] = [];
  const dontCares: number[] = [];

  const grayCode = getGrayCodeOrder(variableCount);
  
  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const minterm = grayCode[rowIndex * row.length + colIndex];
      if (cell === 1) {
        minterms.push(minterm);
      } else if (cell === 0) {
        maxterms.push(minterm);
      } else {
        dontCares.push(minterm);
      }
    });
  });

  return {
    minterms: minterms.sort((a, b) => a - b),
    maxterms: maxterms.sort((a, b) => a - b),
    dontCares: dontCares.sort((a, b) => a - b),
    variableCount,
    variableLabels,
  };
}

export function normalizeFromTruthTable(
  rows: TruthTableRow[],
  variableCount: number,
  variableLabels: string[]
): CanonicalForm {
  const minterms: number[] = [];
  const maxterms: number[] = [];
  const dontCares: number[] = [];

  rows.forEach((row) => {
    if (row.output === 1) {
      minterms.push(row.minterm);
    } else if (row.output === 0) {
      maxterms.push(row.minterm);
    } else {
      dontCares.push(row.minterm);
    }
  });

  return {
    minterms: minterms.sort((a, b) => a - b),
    maxterms: maxterms.sort((a, b) => a - b),
    dontCares: dontCares.sort((a, b) => a - b),
    variableCount,
    variableLabels,
  };
}

export function normalizeFromMinterms(
  minterms: number[],
  dontCares: number[],
  variableCount: number,
  variableLabels: string[]
): CanonicalForm {
  const totalMinterms = Math.pow(2, variableCount);
  const allTerms = new Set([...minterms, ...dontCares]);
  const maxterms: number[] = [];

  for (let i = 0; i < totalMinterms; i++) {
    if (!allTerms.has(i)) {
      maxterms.push(i);
    }
  }

  return {
    minterms: [...minterms].sort((a, b) => a - b),
    maxterms: maxterms.sort((a, b) => a - b),
    dontCares: [...dontCares].sort((a, b) => a - b),
    variableCount,
    variableLabels,
  };
}

export function normalizeFromMaxterms(
  maxterms: number[],
  dontCares: number[],
  variableCount: number,
  variableLabels: string[]
): CanonicalForm {
  const totalMinterms = Math.pow(2, variableCount);
  const allTerms = new Set([...maxterms, ...dontCares]);
  const minterms: number[] = [];

  for (let i = 0; i < totalMinterms; i++) {
    if (!allTerms.has(i)) {
      minterms.push(i);
    }
  }

  return {
    minterms: minterms.sort((a, b) => a - b),
    maxterms: [...maxterms].sort((a, b) => a - b),
    dontCares: [...dontCares].sort((a, b) => a - b),
    variableCount,
    variableLabels,
  };
}

export function normalizeFromExpression(
  expression: string,
  variableCount: number,
  variableLabels: string[],
  isSOP: boolean
): CanonicalForm {
  // Parse the boolean expression and evaluate for each minterm
  const totalMinterms = Math.pow(2, variableCount);
  const minterms: number[] = [];
  const maxterms: number[] = [];

  const cleanExpr = expression.trim();
  
  for (let i = 0; i < totalMinterms; i++) {
    const values: Record<string, boolean> = {};
    variableLabels.forEach((label, idx) => {
      values[label.toUpperCase()] = Boolean((i >> (variableCount - 1 - idx)) & 1);
    });

    const result = evaluateExpression(cleanExpr, values, variableLabels);
    
    if (result) {
      minterms.push(i);
    } else {
      maxterms.push(i);
    }
  }

  return {
    minterms: minterms.sort((a, b) => a - b),
    maxterms: maxterms.sort((a, b) => a - b),
    dontCares: [],
    variableCount,
    variableLabels,
  };
}

function evaluateExpression(
  expr: string,
  values: Record<string, boolean>,
  variableLabels: string[]
): boolean {
  // Simple parser for SOP/POS expressions
  // Supports: +, *, ', (), variable names
  
  let processed = expr
    .replace(/\s+/g, '')
    .replace(/·/g, '*')
    .replace(/\+/g, '|')
    .replace(/\*/g, '&');

  const normalizedLabels = variableLabels
    .map(label => label.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  // Handle NOT operations (A' or Ā)
  normalizedLabels.forEach((label) => {
    const escapedLabel = escapeRegExp(label);
    const upperLabel = label.toUpperCase();
    const regex = new RegExp(`(?<![A-Za-z0-9_])${escapedLabel}'(?![A-Za-z0-9_])`, 'gi');
    processed = processed.replace(regex, `(!${upperLabel})`);
  });

  // Replace variables with their values
  normalizedLabels.forEach((label) => {
    const escapedLabel = escapeRegExp(label);
    const upperLabel = label.toUpperCase();
    const regex = new RegExp(`(?<![A-Za-z0-9_])${escapedLabel}(?![A-Za-z0-9_])`, 'gi');
    processed = processed.replace(regex, values[upperLabel] ? 'true' : 'false');
  });

  // Handle implicit AND (adjacent terms without operator)
  processed = processed.replace(/\)\(/g, ')&(');
  processed = processed.replace(/true\(/g, 'true&(');
  processed = processed.replace(/false\(/g, 'false&(');
  processed = processed.replace(/\)true/g, ')&true');
  processed = processed.replace(/\)false/g, ')&false');
  processed = processed.replace(/truefalse/g, 'true&false');
  processed = processed.replace(/falsetrue/g, 'false&true');
  processed = processed.replace(/truetrue/g, 'true&true');
  processed = processed.replace(/falsefalse/g, 'false&false');

  try {
    // Safe evaluation using Function constructor
    const evalFunc = new Function(`return ${processed};`);
    return Boolean(evalFunc());
  } catch {
    return false;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getGrayCodeOrder(variableCount: number): number[] {
  if (variableCount === 2) {
    return [0, 1, 3, 2];
  } else if (variableCount === 3) {
    return [0, 1, 3, 2, 4, 5, 7, 6];
  } else if (variableCount === 4) {
    return [
      0, 1, 3, 2,
      4, 5, 7, 6,
      12, 13, 15, 14,
      8, 9, 11, 10
    ];
  }
  
  // For higher variable counts, generate Gray code
  const size = Math.pow(2, variableCount);
  const result: number[] = [];
  
  for (let i = 0; i < size; i++) {
    result.push(i ^ (i >> 1));
  }
  
  return result;
}

export function mintermToBinary(minterm: number, variableCount: number): string {
  return minterm.toString(2).padStart(variableCount, '0');
}

export function binaryToMinterm(binary: string): number {
  return parseInt(binary, 2);
}

export function countOnes(binary: string): number {
  return binary.split('').filter(b => b === '1').length;
}
