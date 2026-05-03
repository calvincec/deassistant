import { CanonicalForm, CellValue, TruthTableRow } from '@/types/logic';


export function normalizeFromKMap(
  grid: CellValue[][], variableCount: number, variableLabels: string[]
): CanonicalForm 
{
  const minterms: number[] = [];
  const maxterms: number[] = [];
  const dontCares: number[] = [];
  const { rowBits, colBits } = getKMapDimensions(variableCount);
  const rowGray = getGrayCodeOrder(rowBits);
  const colGray = getGrayCodeOrder(colBits);
  
  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const rowBinary = rowGray[rowIndex].toString(2).padStart(rowBits, '0');
      const colBinary = colGray[colIndex].toString(2).padStart(colBits, '0');
      const minterm = parseInt(`${rowBinary}${colBinary}`, 2);
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
      values[label] = Boolean((i >> (variableCount - 1 - idx)) & 1);
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
        if (source.slice(i, i + label.length) === label) {
          matchedLabel = label;
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

export function generateVariableLabels(count: number, existingLabels: string[] = []): string[] {
  return Array.from({ length: count }, (_, index) => {
    const existing = existingLabels[index]?.trim();
    return existing || getAlphabeticLabel(index);
  });
}

export function getKMapDimensions(variableCount: number): {
  rowBits: number;
  colBits: number;
  rows: number;
  cols: number;
} {
  const rowBits = Math.floor(variableCount / 2);
  const colBits = variableCount - rowBits;

  return {
    rowBits,
    colBits,
    rows: Math.pow(2, rowBits),
    cols: Math.pow(2, colBits),
  };
}

export function getKMapCellMinterm(
  rowIndex: number,
  colIndex: number,
  variableCount: number
): number {
  const { rowBits, colBits } = getKMapDimensions(variableCount);
  const rowGray = getGrayCodeOrder(rowBits);
  const colGray = getGrayCodeOrder(colBits);

  const rowBinary = rowGray[rowIndex].toString(2).padStart(rowBits, '0');
  const colBinary = colGray[colIndex].toString(2).padStart(colBits, '0');

  return parseInt(`${rowBinary}${colBinary}`, 2);
}

export function getKMapCellPosition(minterm: number, variableCount: number): {
  rowIndex: number;
  colIndex: number;
} {
  const { rowBits, colBits } = getKMapDimensions(variableCount);
  const rowGray = getGrayCodeOrder(rowBits);
  const colGray = getGrayCodeOrder(colBits);
  const binary = mintermToBinary(minterm, variableCount);
  const rowBinary = binary.slice(0, rowBits);
  const colBinary = binary.slice(rowBits);

  return {
    rowIndex: rowGray.indexOf(parseInt(rowBinary || '0', 2)),
    colIndex: colGray.indexOf(parseInt(colBinary || '0', 2)),
  };
}

function getAlphabeticLabel(index: number): string {
  let value = index + 1;
  let label = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
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
