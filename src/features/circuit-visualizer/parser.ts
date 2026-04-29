import {
  DigitalJSConnector,
  DigitalJSDevice,
  DigitalJSNetlist,
  ExpressionNode,
} from './types';

type Token =
  | { kind: 'identifier'; value: string }
  | { kind: 'constant'; value: 0 | 1 }
  | { kind: 'operator'; value: '+' | '(' | ')' | '!' | '~' | '*' | '.' | '·' | '=' | '\'' };

interface ParseResult {
  outputName: string;
  expression: ExpressionNode;
}

interface BuildState {
  devices: Record<string, DigitalJSDevice>;
  connectors: DigitalJSConnector[];
  variableIds: Map<string, string>;
  counters: Record<string, number>;
}

export function expressionToNetlist(expression: string): DigitalJSNetlist {
  const { outputName, expression: parsedExpression } = parseExpression(expression);
  const state: BuildState = {
    devices: {},
    connectors: [],
    variableIds: new Map<string, string>(),
    counters: {
      and: 0,
      or: 0,
      not: 0,
      const: 0,
      output: 0,
      input: 0,
    },
  };

  const outputSource = buildNode(parsedExpression, state);
  const outputId = nextId(state, 'output');

  state.devices[outputId] = {
    type: 'Output',
    bits: 1,
    label: outputName,
    net: outputName,
  };

  state.connectors.push({
    from: outputSource,
    to: { id: outputId, port: 'in' },
  });

  return {
    devices: state.devices,
    connectors: state.connectors,
    subcircuits: {},
  };
}

function parseExpression(rawExpression: string): ParseResult {
  const normalizedExpression = rawExpression.trim();
  if (!normalizedExpression) {
    throw new Error('Expression is empty.');
  }

  const assignmentMatch = normalizedExpression.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
  const outputName = assignmentMatch?.[1] ?? 'F';
  const expressionSource = assignmentMatch?.[2] ?? normalizedExpression;
  const tokens = tokenize(expressionSource);
  const parser = new Parser(tokens);
  const expression = parser.parseExpression();

  if (!parser.isAtEnd()) {
    throw new Error('Unexpected trailing input in expression.');
  }

  return {
    outputName,
    expression,
  };
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (/[A-Za-z_]/.test(character)) {
      let end = index + 1;
      while (end < source.length && /[A-Za-z0-9_]/.test(source[end])) {
        end += 1;
      }

      tokens.push({ kind: 'identifier', value: source.slice(index, end) });
      index = end;
      continue;
    }

    if (character === '0' || character === '1') {
      tokens.push({ kind: 'constant', value: character === '1' ? 1 : 0 });
      index += 1;
      continue;
    }

    if ('+()!~*.' .includes(character) || character === '·' || character === '=' || character === '\'') {
      tokens.push({ kind: 'operator', value: character as Token extends { kind: 'operator'; value: infer Value } ? Value : never });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported character '${character}' in expression.`);
  }

  return tokens;
}

class Parser {
  private readonly tokens: Token[];
  private position = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseExpression(): ExpressionNode {
    return this.parseOr();
  }

  isAtEnd(): boolean {
    return this.position >= this.tokens.length;
  }

  private parseOr(): ExpressionNode {
    let node = this.parseAnd();

    while (this.matchOperator('+')) {
      const right = this.parseAnd();
      node = mergeNode('or', node, right);
    }

    return node;
  }

  private parseAnd(): ExpressionNode {
    let node = this.parseUnary();

    while (true) {
      if (this.matchExplicitAnd()) {
        const right = this.parseUnary();
        node = mergeNode('and', node, right);
        continue;
      }

      if (!this.peekCanStartPrimary()) {
        break;
      }

      const right = this.parseUnary();
      node = mergeNode('and', node, right);
    }

    return node;
  }

  private parseUnary(): ExpressionNode {
    if (this.matchOperator('!') || this.matchOperator('~')) {
      return {
        kind: 'not',
        child: this.parseUnary(),
      };
    }

    let node = this.parsePrimary();

    while (this.matchOperator('\'')) {
      node = {
        kind: 'not',
        child: node,
      };
    }

    return node;
  }

  private parsePrimary(): ExpressionNode {
    if (this.matchOperator('(')) {
      const node = this.parseExpression();
      this.expectOperator(')');
      return node;
    }

    const token = this.peek();
    if (!token) {
      throw new Error('Unexpected end of expression.');
    }

    if (token.kind === 'identifier') {
      this.position += 1;
      return { kind: 'variable', name: token.value };
    }

    if (token.kind === 'constant') {
      this.position += 1;
      return { kind: 'constant', value: token.value };
    }

    throw new Error('Expected a variable, constant, or parenthesized expression.');
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private peekCanStartPrimary(): boolean {
    const token = this.peek();
    if (!token) {
      return false;
    }

    if (token.kind === 'identifier' || token.kind === 'constant') {
      return true;
    }

    return token.kind === 'operator' && (token.value === '(' || token.value === '!' || token.value === '~');
  }

  private matchOperator(value: Token extends { kind: 'operator'; value: infer OperatorValue } ? OperatorValue : never): boolean {
    const token = this.peek();
    if (!token || token.kind !== 'operator' || token.value !== value) {
      return false;
    }

    this.position += 1;
    return true;
  }

  private matchExplicitAnd(): boolean {
    const token = this.peek();
    if (!token || token.kind !== 'operator') {
      return false;
    }

    if (token.value === '*' || token.value === '.' || token.value === '·') {
      this.position += 1;
      return true;
    }

    return false;
  }

  private expectOperator(value: Token extends { kind: 'operator'; value: infer OperatorValue } ? OperatorValue : never): void {
    if (!this.matchOperator(value)) {
      throw new Error(`Expected '${value}'.`);
    }
  }
}

function mergeNode(kind: 'and' | 'or', left: ExpressionNode, right: ExpressionNode): ExpressionNode {
  const leftChildren = left.kind === kind ? left.children : [left];
  const rightChildren = right.kind === kind ? right.children : [right];

  return {
    kind,
    children: [...leftChildren, ...rightChildren],
  };
}

function buildNode(node: ExpressionNode, state: BuildState): { id: string; port: string } {
  switch (node.kind) {
    case 'variable': {
      const existingId = state.variableIds.get(node.name);
      if (existingId) {
        return { id: existingId, port: 'out' };
      }

      const inputId = nextId(state, 'input');
      state.variableIds.set(node.name, inputId);
      state.devices[inputId] = {
        type: 'Input',
        bits: 1,
        label: node.name,
        net: node.name,
      };

      return { id: inputId, port: 'out' };
    }
    case 'constant': {
      const constantId = nextId(state, 'const');
      state.devices[constantId] = {
        type: 'Constant',
        bits: 1,
        constant: String(node.value),
        label: String(node.value),
      };

      return { id: constantId, port: 'out' };
    }
    case 'not': {
      const child = buildNode(node.child, state);
      const notId = nextId(state, 'not');
      state.devices[notId] = {
        type: 'Not',
        bits: 1,
        label: 'NOT',
      };
      state.connectors.push({
        from: child,
        to: { id: notId, port: 'in' },
      });
      return { id: notId, port: 'out' };
    }
    case 'and':
    case 'or': {
      const children = node.children.map((child) => buildNode(child, state));
      if (children.length === 1) {
        return children[0];
      }

      const gateId = nextId(state, node.kind);
      const gateType = node.kind === 'and' ? 'And' : 'Or';
      state.devices[gateId] = {
        type: gateType,
        bits: 1,
        inputs: children.length,
        label: gateType.toUpperCase(),
      };

      children.forEach((child, index) => {
        state.connectors.push({
          from: child,
          to: { id: gateId, port: `in${index + 1}` },
        });
      });

      return { id: gateId, port: 'out' };
    }
    default:
      return unreachable(node);
  }
}

function nextId(state: BuildState, prefix: string): string {
  const next = state.counters[prefix] ?? 0;
  state.counters[prefix] = next + 1;
  return `${prefix}_${next}`;
}

function unreachable(value: never): never {
  throw new Error(`Unsupported expression node: ${String(value)}`);
}