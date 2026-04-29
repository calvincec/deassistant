import { CanonicalForm, ExpressionReductionResult } from '@/types/logic';
import { normalizeFromExpression } from '@/logic/normalize/inputNormalizer';

type TokenType = 'label' | 'or' | 'and' | 'lparen' | 'rparen' | 'not';

type ExpressionNode =
  | { type: 'var'; name: string }
  | { type: 'const'; value: 0 | 1 }
  | { type: 'not'; child: ExpressionNode }
  | { type: 'and'; children: ExpressionNode[] }
  | { type: 'or'; children: ExpressionNode[] };

interface Token {
  type: TokenType;
  value?: string;
}

interface ParseResult {
  ast: ExpressionNode | null;
  error: string | null;
}

interface ReductionPass {
  ast: ExpressionNode;
  changed: boolean;
  rule?: string;
}

export interface ExpressionAnalysisResult {
  error: string | null;
  strategy: 'solver' | 'theorem';
  canonicalForm: CanonicalForm | null;
  reduction: ExpressionReductionResult | null;
}

const MAX_PASSES = 20;

export function analyzeExpressionInput(
  expression: string,
  variableCount: number,
  variableLabels: string[],
  isSOP: boolean
): ExpressionAnalysisResult {
  const trimmed = expression.trim();

  if (!trimmed) {
    return {
      error: 'Expression is empty',
      strategy: 'solver',
      canonicalForm: null,
      reduction: null,
    };
  }

  const parsed = parseExpression(trimmed, variableLabels);
  if (parsed.error || !parsed.ast) {
    return {
      error: parsed.error ?? 'Invalid expression',
      strategy: 'solver',
      canonicalForm: null,
      reduction: null,
    };
  }

  if (hasGrouping(trimmed)) {
    return {
      error: null,
      strategy: 'theorem',
      canonicalForm: null,
      reduction: reduceWithTheorems(parsed.ast),
    };
  }

  return {
    error: null,
    strategy: 'solver',
    canonicalForm: normalizeFromExpression(trimmed, variableCount, variableLabels, isSOP),
    reduction: null,
  };
}

function hasGrouping(expression: string): boolean {
  return /[()]/.test(expression);
}

function parseExpression(expression: string, variableLabels: string[]): ParseResult {
  const normalizedLabels = variableLabels
    .map((label) => label.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (!normalizedLabels.length) {
    return { ast: null, error: 'Define at least one variable label' };
  }

  const tokens = tokenize(expression, normalizedLabels);
  if ('error' in tokens) {
    return { ast: null, error: tokens.error };
  }

  let index = 0;

  const canEndTerm = (token: Token | null): boolean => !!token && (token.type === 'label' || token.type === 'rparen' || token.type === 'not');
  const canStartTerm = (token: Token | null): boolean => !!token && (token.type === 'label' || token.type === 'lparen');

  const parseExpressionNode = (): ExpressionNode => {
    let left = parseTerm();

    while (index < tokens.length && tokens[index].type === 'or') {
      index += 1;
      const right = parseTerm();
      left = combine('or', [left, right]);
    }

    return left;
  };

  const parseTerm = (): ExpressionNode => {
    let left = parseFactor();

    while (index < tokens.length) {
      const current = tokens[index];
      const previous = index > 0 ? tokens[index - 1] : null;
      const explicitAnd = current.type === 'and';
      const implicitAnd = !explicitAnd && canEndTerm(previous) && canStartTerm(current);

      if (!explicitAnd && !implicitAnd) {
        break;
      }

      if (explicitAnd) {
        index += 1;
      }

      const right = parseFactor();
      left = combine('and', [left, right]);
    }

    return left;
  };

  const parseFactor = (): ExpressionNode => {
    const token = tokens[index];

    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    let node: ExpressionNode;

    if (token.type === 'label') {
      node = { type: 'var', name: token.value ?? '' };
      index += 1;
    } else if (token.type === 'lparen') {
      index += 1;
      node = parseExpressionNode();

      if (!tokens[index] || tokens[index].type !== 'rparen') {
        throw new Error('Missing closing parenthesis');
      }

      index += 1;
    } else {
      throw new Error('Invalid factor');
    }

    while (index < tokens.length && tokens[index].type === 'not') {
      node = { type: 'not', child: node };
      index += 1;
    }

    return node;
  };

  try {
    const ast = parseExpressionNode();
    if (index !== tokens.length) {
      return { ast: null, error: 'Unexpected trailing tokens' };
    }

    return { ast, error: null };
  } catch (error) {
    return { ast: null, error: error instanceof Error ? error.message : 'Invalid expression' };
  }
}

function tokenize(expression: string, labels: string[]): Token[] | { error: string } {
  const source = expression.replace(/\s+/g, '');
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (char === '+') {
      tokens.push({ type: 'or' });
      index += 1;
      continue;
    }

    if (char === '·' || char === '*') {
      tokens.push({ type: 'and' });
      index += 1;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen' });
      index += 1;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen' });
      index += 1;
      continue;
    }

    if (char === "'") {
      tokens.push({ type: 'not' });
      index += 1;
      continue;
    }

    if (/[A-Za-z0-9_]/.test(char)) {
      let matchedLabel: string | null = null;

      for (const label of labels) {
        if (source.slice(index, index + label.length) === label) {
          matchedLabel = label;
          break;
        }
      }

      if (!matchedLabel) {
        return { error: `Unknown variable near "${source.slice(index, index + 8)}"` };
      }

      tokens.push({ type: 'label', value: matchedLabel });
      index += matchedLabel.length;
      continue;
    }

    return { error: `Invalid character "${char}"` };
  }

  if (!tokens.length) {
    return { error: 'Expression is empty' };
  }

  let balance = 0;
  const canEndTerm = (token: Token | null): boolean => !!token && (token.type === 'label' || token.type === 'rparen' || token.type === 'not');
  const canStartTerm = (token: Token | null): boolean => !!token && (token.type === 'label' || token.type === 'lparen');

  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    const previous = i > 0 ? tokens[i - 1] : null;
    const next = i < tokens.length - 1 ? tokens[i + 1] : null;

    if (current.type === 'lparen') {
      balance += 1;
    }

    if (current.type === 'rparen') {
      balance -= 1;
      if (balance < 0) {
        return { error: 'Unbalanced parentheses' };
      }

      if (previous && (previous.type === 'or' || previous.type === 'and' || previous.type === 'lparen')) {
        return { error: 'Empty or invalid term inside parentheses' };
      }
    }

    if (current.type === 'or' || current.type === 'and') {
      if (!previous || !next) {
        return { error: 'Expression cannot start or end with an operator' };
      }

      if (!canEndTerm(previous) || !canStartTerm(next)) {
        return { error: 'Invalid operator placement' };
      }
    }

    if (current.type === 'not') {
      if (!previous || !canEndTerm(previous)) {
        return { error: "Apostrophe (') must follow a variable, group, or another complement" };
      }
    }
  }

  if (balance !== 0) {
    return { error: 'Unbalanced parentheses' };
  }

  return tokens;
}

function reduceWithTheorems(initial: ExpressionNode): ExpressionReductionResult {
  const steps: ExpressionReductionResult['steps'] = [];
  let current = initial;

  steps.push({
    title: 'Original Expression',
    description: 'Start with the raw expression.',
    expression: renderExpression(current),
  });

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const passResult = simplifyPass(current);
    if (!passResult.changed) {
      break;
    }

    current = passResult.ast;
    steps.push({
      title: passResult.rule ?? `Reduction Pass ${pass + 1}`,
      description: 'Applied boolean laws to reduce the expression.',
      expression: renderExpression(current),
    });
  }

  if (steps[steps.length - 1]?.expression !== renderExpression(current)) {
    steps.push({
      title: 'Final Simplified Form',
      description: 'No further laws apply.',
      expression: renderExpression(current),
    });
  }

  return {
    expression: renderExpression(current),
    steps,
  };
}

function simplifyPass(node: ExpressionNode): ReductionPass {
  const simplified = simplifyNode(node);
  const before = renderExpression(node);
  const after = renderExpression(simplified.ast);

  return {
    ...simplified,
    changed: simplified.changed || before !== after,
  };
}

function simplifyNode(node: ExpressionNode): ReductionPass {
  switch (node.type) {
    case 'var':
    case 'const':
      return { ast: node, changed: false };

    case 'not': {
      const child = simplifyNode(node.child);
      let next: ExpressionNode = { type: 'not', child: child.ast };
      let rule: string | undefined;

      if (next.child.type === 'not') {
        next = next.child.child;
        rule = 'Double Negation';
      } else if (next.child.type === 'const') {
        next = { type: 'const', value: next.child.value === 1 ? 0 : 1 };
        rule = 'Complement Law';
      } else if (next.child.type === 'and') {
        next = { type: 'or', children: next.child.children.map((part) => ({ type: 'not', child: part })) };
        rule = "De Morgan's Law";
      } else if (next.child.type === 'or') {
        next = { type: 'and', children: next.child.children.map((part) => ({ type: 'not', child: part })) };
        rule = "De Morgan's Law";
      }

      return {
        ast: normalizeNode(next),
        changed: child.changed || !!rule,
        rule,
      };
    }

    case 'and':
    case 'or': {
      const simplifiedChildren = node.children.map((child) => simplifyNode(child));
      const childChange = simplifiedChildren.some((child) => child.changed);
      const flattened = flatten(node.type, simplifiedChildren.map((child) => child.ast));
      const distributed = distribute(flattened);
      const normalized = normalizeNode(distributed.ast);

      return {
        ast: normalized,
        changed: childChange || distributed.changed || renderExpression(normalized) !== renderExpression(node),
        rule: distributed.rule,
      };
    }
  }
}

function distribute(node: ExpressionNode): ReductionPass {
  if (node.type === 'and') {
    const orIndex = node.children.findIndex((child) => child.type === 'or');
    if (orIndex === -1) {
      return { ast: node, changed: false };
    }

    const orNode = node.children[orIndex] as Extract<ExpressionNode, { type: 'or' }>;
    const rest = node.children.filter((_, index) => index !== orIndex);
    const distributed = orNode.children.map((child) => normalizeNode(flatten('and', [...rest, child])));
    return { ast: normalizeNode(flatten('or', distributed)), changed: true, rule: 'Distributive Law' };
  }

  if (node.type === 'or') {
    const andIndex = node.children.findIndex((child) => child.type === 'and');
    if (andIndex === -1) {
      return { ast: node, changed: false };
    }

    const andNode = node.children[andIndex] as Extract<ExpressionNode, { type: 'and' }>;
    const rest = node.children.filter((_, index) => index !== andIndex);
    const distributed = andNode.children.map((child) => normalizeNode(flatten('or', [...rest, child])));
    return { ast: normalizeNode(flatten('and', distributed)), changed: true, rule: 'Distributive Law' };
  }

  return { ast: node, changed: false };
}

function normalizeNode(node: ExpressionNode): ExpressionNode {
  switch (node.type) {
    case 'var':
    case 'const':
      return node;
    case 'not':
      return { type: 'not', child: normalizeNode(node.child) };
    case 'and':
    case 'or': {
      const children = flatten(node.type, node.children.map((child) => normalizeNode(child))).children;
      const unique: ExpressionNode[] = [];
      const seen = new Set<string>();

      children.forEach((child) => {
        const rendered = renderExpression(child);
        if (!seen.has(rendered)) {
          seen.add(rendered);
          unique.push(child);
        }
      });

      if (unique.length === 1) {
        return unique[0];
      }

      if (unique.some((child) => child.type === 'const' && child.value === (node.type === 'and' ? 0 : 1))) {
        return { type: 'const', value: node.type === 'and' ? 0 : 1 };
      }

      const neutral = node.type === 'and' ? 1 : 0;
      const filtered = unique.filter((child) => !(child.type === 'const' && child.value === neutral));

      if (!filtered.length) {
        return { type: 'const', value: neutral };
      }

      if (filtered.length === 1) {
        return filtered[0];
      }

      return { type: node.type, children: filtered };
    }
  }
}

function flatten(type: 'and' | 'or', children: ExpressionNode[]): { type: 'and' | 'or'; children: ExpressionNode[] } {
  const flattened: ExpressionNode[] = [];

  children.forEach((child) => {
    if (child.type === type) {
      flattened.push(...child.children);
    } else {
      flattened.push(child);
    }
  });

  return { type, children: flattened };
}

function combine(type: 'and' | 'or', children: ExpressionNode[]): ExpressionNode {
  return normalizeNode(flatten(type, children));
}

function renderExpression(node: ExpressionNode): string {
  switch (node.type) {
    case 'var':
      return node.name;
    case 'const':
      return String(node.value);
    case 'not': {
      const inner = renderExpression(node.child);
      return needsParens(node.child) ? `(${inner})'` : `${inner}'`;
    }
    case 'and':
      return node.children.map((child) => renderChild(child, 'and')).join('·');
    case 'or':
      return node.children.map((child) => renderChild(child, 'or')).join('+');
  }
}

function renderChild(node: ExpressionNode, parent: 'and' | 'or'): string {
  const rendered = renderExpression(node);
  if (parent === 'and' && node.type === 'or') {
    return `(${rendered})`;
  }
  if (parent === 'or' && node.type === 'and') {
    return `(${rendered})`;
  }
  return rendered;
}

function needsParens(node: ExpressionNode): boolean {
  return node.type === 'and' || node.type === 'or';
}