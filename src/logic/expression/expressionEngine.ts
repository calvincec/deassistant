export type ExpressionNode =
  | { kind: 'var'; name: string }
  | { kind: 'const'; value: boolean }
  | { kind: 'not'; expr: ExpressionNode }
  | {
      kind: 'and' | 'or' | 'xor' | 'nand' | 'nor';
      left: ExpressionNode;
      right: ExpressionNode;
    };

interface Token {
  type:
    | 'var'
    | 'const'
    | 'lparen'
    | 'rparen'
    | 'comma'
    | 'or'
    | 'and'
    | 'xor'
    | 'nand'
    | 'nor'
    | 'notPrefix'
    | 'notPost';
  value?: string;
}

export interface LawReductionStep {
  rule: string;
  before: string;
  after: string;
}

export class ExpressionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpressionParseError';
  }
}

export function parseBooleanExpression(
  rawExpression: string,
  variableLabels: string[]
): ExpressionNode {
  const labels = variableLabels.map((label) => label.trim()).filter(Boolean);
  if (!labels.length) {
    throw new ExpressionParseError('Define at least one variable label');
  }

  const source = normalizeExpressionSource(rawExpression);
  if (!source) {
    throw new ExpressionParseError('Expression is empty');
  }

  const tokens = tokenizeExpression(source, labels);
  const parser = new ExpressionParser(tokens);
  const ast = parser.parseExpression();

  if (!parser.isAtEnd()) {
    throw new ExpressionParseError('Unexpected tokens at end of expression');
  }

  return ast;
}

export function evaluateBooleanExpressionAst(
  ast: ExpressionNode,
  values: Record<string, boolean>
): boolean {
  switch (ast.kind) {
    case 'var':
      return Boolean(values[ast.name]);
    case 'const':
      return ast.value;
    case 'not':
      return !evaluateBooleanExpressionAst(ast.expr, values);
    case 'and':
      return evaluateBooleanExpressionAst(ast.left, values) && evaluateBooleanExpressionAst(ast.right, values);
    case 'or':
      return evaluateBooleanExpressionAst(ast.left, values) || evaluateBooleanExpressionAst(ast.right, values);
    case 'xor':
      return evaluateBooleanExpressionAst(ast.left, values) !== evaluateBooleanExpressionAst(ast.right, values);
    case 'nand':
      return !(evaluateBooleanExpressionAst(ast.left, values) && evaluateBooleanExpressionAst(ast.right, values));
    case 'nor':
      return !(evaluateBooleanExpressionAst(ast.left, values) || evaluateBooleanExpressionAst(ast.right, values));
    default:
      return false;
  }
}

export function reduceExpressionByLaws(
  ast: ExpressionNode,
  maxSteps = 128
): { simplified: ExpressionNode; steps: LawReductionStep[] } {
  let current = ast;
  const steps: LawReductionStep[] = [];

  for (let i = 0; i < maxSteps; i++) {
    const reduced = applyOneReduction(current);
    if (!reduced.changed) {
      break;
    }

    steps.push({
      rule: reduced.rule,
      before: expressionAstToString(current),
      after: expressionAstToString(reduced.node),
    });

    current = reduced.node;
  }

  return { simplified: current, steps };
}

export function expressionAstToString(node: ExpressionNode): string {
  return stringify(node, 0);
}

function normalizeExpressionSource(expression: string): string {
  const withoutAssignment = expression.trim().replace(/^\s*[Ff]\s*=\s*/, '');

  return withoutAssignment
    .replace(/×|\*/g, '·')
    .replace(/\s+/g, '')
    .trim();
}

function tokenizeExpression(source: string, variableLabels: string[]): Token[] {
  const labels = [...variableLabels].sort((a, b) => b.length - a.length);
  const tokens: Token[] = [];

  let index = 0;

  const pushToken = (token: Token) => {
    tokens.push(token);
  };

  while (index < source.length) {
    const ch = source[index];

    if (ch === '(') {
      pushToken({ type: 'lparen' });
      index += 1;
      continue;
    }

    if (ch === ')') {
      pushToken({ type: 'rparen' });
      index += 1;
      continue;
    }

    if (ch === ',') {
      pushToken({ type: 'comma' });
      index += 1;
      continue;
    }

    if (ch === '+') {
      pushToken({ type: 'or' });
      index += 1;
      continue;
    }

    if (ch === '·' || ch === '.') {
      pushToken({ type: 'and' });
      index += 1;
      continue;
    }

    if (ch === '^' || ch === '⊕') {
      pushToken({ type: 'xor' });
      index += 1;
      continue;
    }

    if (ch === '!') {
      pushToken({ type: 'notPrefix' });
      index += 1;
      continue;
    }

    if (ch === "'") {
      pushToken({ type: 'notPost' });
      index += 1;
      continue;
    }

    if (ch === '0' || ch === '1') {
      pushToken({ type: 'const', value: ch });
      index += 1;
      continue;
    }

    let matchedLabel: string | null = null;
    for (const label of labels) {
      if (label && source.slice(index, index + label.length) === label) {
        matchedLabel = label;
        break;
      }
    }

    if (matchedLabel) {
      pushToken({ type: 'var', value: matchedLabel });
      index += matchedLabel.length;
      continue;
    }

    const keywordMatch = source.slice(index).match(/^(XOR|NAND|NOR|NOT)\b/i);
    if (keywordMatch) {
      const keyword = keywordMatch[1].toUpperCase();
      if (keyword === 'XOR') pushToken({ type: 'xor' });
      if (keyword === 'NAND') pushToken({ type: 'nand' });
      if (keyword === 'NOR') pushToken({ type: 'nor' });
      if (keyword === 'NOT') pushToken({ type: 'notPrefix' });
      index += keywordMatch[0].length;
      continue;
    }

    throw new ExpressionParseError(`Invalid token near "${source.slice(index, index + 8)}"`);
  }

  return insertImplicitAnd(tokens);
}

function insertImplicitAnd(tokens: Token[]): Token[] {
  const result: Token[] = [];

  const endsTerm = (token: Token): boolean =>
    token.type === 'var' || token.type === 'const' || token.type === 'rparen' || token.type === 'notPost';

  const startsTerm = (token: Token, next: Token | null): boolean => {
    if (token.type === 'var' || token.type === 'const' || token.type === 'lparen' || token.type === 'notPrefix') {
      return true;
    }

    void next;
    return false;
  };

  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i];
    const next = i < tokens.length - 1 ? tokens[i + 1] : null;

    result.push(current);

    if (!next) continue;
    if (endsTerm(current) && startsTerm(next, i < tokens.length - 2 ? tokens[i + 2] : null)) {
      result.push({ type: 'and' });
    }
  }

  return result;
}

class ExpressionParser {
  private readonly tokens: Token[];

  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseExpression(): ExpressionNode {
    return this.parseOrLayer();
  }

  isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private parseOrLayer(): ExpressionNode {
    let node = this.parseXorLayer();

    while (this.match('or', 'nor')) {
      const operator = this.previous().type;
      const right = this.parseXorLayer();
      node = {
        kind: operator === 'or' ? 'or' : 'nor',
        left: node,
        right,
      };
    }

    return node;
  }

  private parseXorLayer(): ExpressionNode {
    let node = this.parseAndLayer();

    while (this.match('xor')) {
      const right = this.parseAndLayer();
      node = {
        kind: 'xor',
        left: node,
        right,
      };
    }

    return node;
  }

  private parseAndLayer(): ExpressionNode {
    let node = this.parseUnary();

    while (this.match('and', 'nand')) {
      const operator = this.previous().type;
      const right = this.parseUnary();
      node = {
        kind: operator === 'and' ? 'and' : 'nand',
        left: node,
        right,
      };
    }

    return node;
  }

  private parseUnary(): ExpressionNode {
    if (this.match('notPrefix')) {
      return {
        kind: 'not',
        expr: this.parseUnary(),
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ExpressionNode {
    let node = this.parsePrimary();

    while (this.match('notPost')) {
      node = {
        kind: 'not',
        expr: node,
      };
    }

    return node;
  }

  private parsePrimary(): ExpressionNode {
    if (this.match('const')) {
      return {
        kind: 'const',
        value: this.previous().value === '1',
      };
    }

    if (this.match('var')) {
      return {
        kind: 'var',
        name: this.previous().value ?? '',
      };
    }

    if (this.match('lparen')) {
      const node = this.parseExpression();
      this.consume('rparen', 'Missing closing parenthesis');
      return node;
    }

    if (this.match('xor', 'nand', 'nor')) {
      const operator = this.previous().type;
      if (!this.match('lparen')) {
        throw new ExpressionParseError('Expected function arguments in parentheses');
      }

      const args: ExpressionNode[] = [];
      if (!this.check('rparen')) {
        do {
          args.push(this.parseExpression());
        } while (this.match('comma'));
      }

      this.consume('rparen', 'Missing closing parenthesis in function call');

      if (args.length < 2) {
        throw new ExpressionParseError('Function calls require at least two arguments');
      }

      return foldFunction(operator, args);
    }

    throw new ExpressionParseError('Unexpected token in expression');
  }

  private match(...types: Token['type'][]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.current += 1;
        return true;
      }
    }
    return false;
  }

  private check(type: Token['type']): boolean {
    if (this.isAtEnd()) return false;
    return this.tokens[this.current].type === type;
  }

  private consume(type: Token['type'], message: string): Token {
    if (this.check(type)) {
      this.current += 1;
      return this.previous();
    }

    throw new ExpressionParseError(message);
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}

function foldFunction(operator: Token['type'], args: ExpressionNode[]): ExpressionNode {
  const baseOp = operator === 'xor' ? 'xor' : operator === 'nand' ? 'and' : 'or';

  let node = args[0];
  for (let i = 1; i < args.length; i++) {
    node = {
      kind: baseOp,
      left: node,
      right: args[i],
    } as ExpressionNode;
  }

  if (operator === 'nand' || operator === 'nor') {
    return {
      kind: 'not',
      expr: node,
    };
  }

  return node;
}

function applyOneReduction(node: ExpressionNode): {
  node: ExpressionNode;
  changed: boolean;
  rule: string;
} {
  if (node.kind === 'not') {
    const inner = applyOneReduction(node.expr);
    if (inner.changed) {
      return {
        node: { kind: 'not', expr: inner.node },
        changed: true,
        rule: inner.rule,
      };
    }

    if (node.expr.kind === 'not') {
      return { node: node.expr.expr, changed: true, rule: 'Double Negation' };
    }

    if (node.expr.kind === 'and') {
      return {
        node: {
          kind: 'or',
          left: { kind: 'not', expr: node.expr.left },
          right: { kind: 'not', expr: node.expr.right },
        },
        changed: true,
        rule: "De Morgan's Law",
      };
    }

    if (node.expr.kind === 'or') {
      return {
        node: {
          kind: 'and',
          left: { kind: 'not', expr: node.expr.left },
          right: { kind: 'not', expr: node.expr.right },
        },
        changed: true,
        rule: "De Morgan's Law",
      };
    }

    if (node.expr.kind === 'const') {
      return {
        node: { kind: 'const', value: !node.expr.value },
        changed: true,
        rule: 'Complement of Constant',
      };
    }

    return { node, changed: false, rule: '' };
  }

  if (node.kind === 'and' || node.kind === 'or' || node.kind === 'xor' || node.kind === 'nand' || node.kind === 'nor') {
    const left = applyOneReduction(node.left);
    if (left.changed) {
      return {
        node: { ...node, left: left.node },
        changed: true,
        rule: left.rule,
      };
    }

    const right = applyOneReduction(node.right);
    if (right.changed) {
      return {
        node: { ...node, right: right.node },
        changed: true,
        rule: right.rule,
      };
    }

    if (node.kind === 'xor') {
      return {
        node: {
          kind: 'or',
          left: {
            kind: 'and',
            left: node.left,
            right: { kind: 'not', expr: node.right },
          },
          right: {
            kind: 'and',
            left: { kind: 'not', expr: node.left },
            right: node.right,
          },
        },
        changed: true,
        rule: 'XOR Expansion',
      };
    }

    if (node.kind === 'nand') {
      return {
        node: {
          kind: 'not',
          expr: {
            kind: 'and',
            left: node.left,
            right: node.right,
          },
        },
        changed: true,
        rule: 'NAND Expansion',
      };
    }

    if (node.kind === 'nor') {
      return {
        node: {
          kind: 'not',
          expr: {
            kind: 'or',
            left: node.left,
            right: node.right,
          },
        },
        changed: true,
        rule: 'NOR Expansion',
      };
    }

    if (node.kind === 'and') {
      if (isConstant(node.left, false) || isConstant(node.right, false)) {
        return { node: { kind: 'const', value: false }, changed: true, rule: 'Null Law' };
      }
      if (isConstant(node.left, true)) {
        return { node: node.right, changed: true, rule: 'Identity Law' };
      }
      if (isConstant(node.right, true)) {
        return { node: node.left, changed: true, rule: 'Identity Law' };
      }
      if (structurallyEqual(node.left, node.right)) {
        return { node: node.left, changed: true, rule: 'Idempotent Law' };
      }
      if (isComplementPair(node.left, node.right)) {
        return { node: { kind: 'const', value: false }, changed: true, rule: 'Complement Law' };
      }
    }

    if (node.kind === 'or') {
      if (isConstant(node.left, true) || isConstant(node.right, true)) {
        return { node: { kind: 'const', value: true }, changed: true, rule: 'Dominance Law' };
      }
      if (isConstant(node.left, false)) {
        return { node: node.right, changed: true, rule: 'Identity Law' };
      }
      if (isConstant(node.right, false)) {
        return { node: node.left, changed: true, rule: 'Identity Law' };
      }
      if (structurallyEqual(node.left, node.right)) {
        return { node: node.left, changed: true, rule: 'Idempotent Law' };
      }
      if (isComplementPair(node.left, node.right)) {
        return { node: { kind: 'const', value: true }, changed: true, rule: 'Complement Law' };
      }
    }
  }

  return { node, changed: false, rule: '' };
}

function isConstant(node: ExpressionNode, value: boolean): boolean {
  return node.kind === 'const' && node.value === value;
}

function isComplementPair(a: ExpressionNode, b: ExpressionNode): boolean {
  return (
    (a.kind === 'not' && structurallyEqual(a.expr, b)) ||
    (b.kind === 'not' && structurallyEqual(b.expr, a))
  );
}

function structurallyEqual(a: ExpressionNode, b: ExpressionNode): boolean {
  if (a.kind !== b.kind) return false;

  if (a.kind === 'var' && b.kind === 'var') return a.name === b.name;
  if (a.kind === 'const' && b.kind === 'const') return a.value === b.value;
  if (a.kind === 'not' && b.kind === 'not') return structurallyEqual(a.expr, b.expr);

  if (
    (a.kind === 'and' || a.kind === 'or' || a.kind === 'xor' || a.kind === 'nand' || a.kind === 'nor') &&
    (b.kind === 'and' || b.kind === 'or' || b.kind === 'xor' || b.kind === 'nand' || b.kind === 'nor')
  ) {
    return structurallyEqual(a.left, b.left) && structurallyEqual(a.right, b.right);
  }

  return false;
}

function stringify(node: ExpressionNode, parentPrecedence: number): string {
  if (node.kind === 'var') return node.name;
  if (node.kind === 'const') return node.value ? '1' : '0';

  if (node.kind === 'not') {
    const child = node.expr;
    if (child.kind === 'var' || child.kind === 'const') {
      return `${stringify(child, precedence(node))}'`;
    }
    return `(${stringify(child, 0)})'`;
  }

  const op = operatorSymbol(node.kind);
  const currentPrecedence = precedence(node);
  const left = stringify(node.left, currentPrecedence);
  const right = stringify(node.right, currentPrecedence + 1);
  const combined = `${left}${op}${right}`;

  if (currentPrecedence < parentPrecedence) {
    return `(${combined})`;
  }

  return combined;
}

function operatorSymbol(kind: ExpressionNode['kind']): string {
  switch (kind) {
    case 'and':
      return '·';
    case 'or':
      return '+';
    case 'xor':
      return '⊕';
    case 'nand':
      return ' NAND ';
    case 'nor':
      return ' NOR ';
    default:
      return '';
  }
}

function precedence(node: ExpressionNode): number {
  switch (node.kind) {
    case 'or':
    case 'nor':
      return 1;
    case 'xor':
      return 2;
    case 'and':
    case 'nand':
      return 3;
    case 'not':
      return 4;
    default:
      return 5;
  }
}
