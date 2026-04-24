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
  type TokenType = 'var' | 'or' | 'and' | 'lparen' | 'rparen' | 'not';
  interface Token {
    type: TokenType;
    value?: string;
  }

  const normalizedLabels = variableLabels
    .map((label) => label.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (!normalizedLabels.length) return false;

  const labelLookup = new Map(
    normalizedLabels.map((label) => [label.toLowerCase(), label.toUpperCase()])
  );

  const tokens: Token[] = [];
  let i = 0;
  const source = expr.replace(/\s+/g, '');

  while (i < source.length) {
    const ch = source[i];

    if (ch === '+') {
      tokens.push({ type: 'or' });
      i += 1;
      continue;
    }

    if (ch === '·' || ch === '*') {
      tokens.push({ type: 'and' });
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i += 1;
      continue;
    }

    if (ch === "'") {
      tokens.push({ type: 'not' });
      i += 1;
      continue;
    }

    if (/[A-Za-z0-9_]/.test(ch)) {
      let matchedLabel: string | null = null;
      for (const label of normalizedLabels) {
        if (source.slice(i, i + label.length).toLowerCase() === label.toLowerCase()) {
          matchedLabel = labelLookup.get(label.toLowerCase()) ?? label.toUpperCase();
          break;
        }
      }

      if (!matchedLabel) {
        return false;
      }

      tokens.push({ type: 'var', value: matchedLabel });
      i += matchedLabel.length;
      continue;
    }

    return false;
  }

  let index = 0;

  const canEndTerm = (token: Token | null): boolean => {
    if (!token) return false;
    return token.type === 'var' || token.type === 'rparen' || token.type === 'not';
  };

  const canStartTerm = (token: Token | null): boolean => {
    if (!token) return false;
    return token.type === 'var' || token.type === 'lparen';
  };

  const parseExpression = (): boolean => {
    let left = parseTerm();

    while (index < tokens.length && tokens[index].type === 'or') {
      index += 1;
      const right = parseTerm();
      left = left || right;
    }

    return left;
  };

  const parseTerm = (): boolean => {
    let left = parseFactor();

    while (index < tokens.length) {
      const current = tokens[index];
      const previous = index > 0 ? tokens[index - 1] : null;
      const explicitAnd = current.type === 'and';
      const implicitAnd = !explicitAnd && canEndTerm(previous) && canStartTerm(current);

      if (!explicitAnd && !implicitAnd) break;

      if (explicitAnd) {
        index += 1;
      }

      const right = parseFactor();
      left = left && right;
    }

    return left;
  };

  const parseFactor = (): boolean => {
    let value: boolean;
    const token = tokens[index];

    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (token.type === 'var') {
      value = Boolean(values[token.value ?? '']);
      index += 1;
    } else if (token.type === 'lparen') {
      index += 1;
      value = parseExpression();
      if (!tokens[index] || tokens[index].type !== 'rparen') {
        throw new Error('Missing closing parenthesis');
      }
      index += 1;
    } else {
      throw new Error('Invalid factor');
    }

    while (index < tokens.length && tokens[index].type === 'not') {
      value = !value;
      index += 1;
    }

    return value;
  };

  try {
    const result = parseExpression();
    if (index !== tokens.length) return false;
    return result;
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
