import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeFromExpression } from '@/logic/normalize/inputNormalizer';

const operatorButtons = [
  { symbol: '+', label: 'OR', className: 'bg-accent/20 hover:bg-accent/30 text-accent' },
  { symbol: '·', label: 'AND', className: 'bg-primary/20 hover:bg-primary/30 text-primary' },
  { symbol: "'", label: 'NOT', className: 'bg-destructive/20 hover:bg-destructive/30 text-destructive' },
  { symbol: '(', label: '(', className: 'bg-muted hover:bg-muted/80 text-muted-foreground' },
  { symbol: ')', label: ')', className: 'bg-muted hover:bg-muted/80 text-muted-foreground' },
];

export function ExpressionInput() {
  const { variableConfig, setCanonicalForm } = useAppStore();
  const { count, labels } = variableConfig;
  
  const [expression, setExpression] = useState('');
  const [format, setFormat] = useState<'SOP' | 'POS'>('SOP');
  const [error, setError] = useState<string | null>(null);

  const handleInsert = (symbol: string) => {
    setExpression(prev => {
      const previousChar = prev.slice(-1);
      const startsLikeVariable = /^[A-Za-z0-9_]/.test(symbol);
      const needsImplicitAnd =
        (startsLikeVariable || symbol === '(') && /[A-Za-z0-9_')]/.test(previousChar);

      return `${prev}${needsImplicitAnd ? '·' : ''}${symbol}`;
    });
  };

  const [a, b, c] = labels;
  const sopExample = a && b && c
    ? `${a}'·${b} + ${a}·${c}' + ${b}·${c}`
    : "A'·B + A·C' + B·C";
  const posExample = a && b && c
    ? `(${a} + ${b})·(${a}' + ${c})·(${b} + ${c}')`
    : "(A + B)·(A' + C)·(B + C')";

  const validateExpression = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Expression is empty';
    }

    const normalizedLabels = labels
      .map((label) => label.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    if (!normalizedLabels.length) {
      return 'Define at least one variable label';
    }

    const labelLookup = new Map(normalizedLabels.map((label) => [label.toLowerCase(), label]));
    const allowedChars = /^[A-Za-z0-9_+·()'\s]*$/;
    if (!allowedChars.test(value)) {
      return 'Only variable names, +, ·, (, ), and apostrophe (\') are allowed';
    }

    type TokenType = 'label' | 'or' | 'and' | 'lparen' | 'rparen' | 'not';
    type Token = { type: TokenType; raw: string };
    const tokens: Token[] = [];

    let i = 0;
    while (i < value.length) {
      const char = value[i];

      if (/\s/.test(char)) {
        i += 1;
        continue;
      }

      if (char === '+') {
        tokens.push({ type: 'or', raw: char });
        i += 1;
        continue;
      }

      if (char === '·') {
        tokens.push({ type: 'and', raw: char });
        i += 1;
        continue;
      }

      if (char === '(') {
        tokens.push({ type: 'lparen', raw: char });
        i += 1;
        continue;
      }

      if (char === ')') {
        tokens.push({ type: 'rparen', raw: char });
        i += 1;
        continue;
      }

      if (char === "'") {
        tokens.push({ type: 'not', raw: char });
        i += 1;
        continue;
      }

      if (/[A-Za-z0-9_]/.test(char)) {
        let matchedLabel: string | null = null;
        for (const label of normalizedLabels) {
          if (value.slice(i, i + label.length).toLowerCase() === label.toLowerCase()) {
            matchedLabel = labelLookup.get(label.toLowerCase()) ?? label;
            break;
          }
        }

        if (!matchedLabel) {
          return `Unknown variable near "${value.slice(i, i + 8)}"`;
        }

        tokens.push({ type: 'label', raw: matchedLabel });
        i += matchedLabel.length;
        continue;
      }

      return `Invalid character "${char}"`;
    }

    if (!tokens.length) {
      return 'Expression is empty';
    }

    let balance = 0;
    const isOperandEnd = (type: TokenType) => type === 'label' || type === 'rparen' || type === 'not';
    const isOperandStart = (type: TokenType) => type === 'label' || type === 'lparen';

    for (let index = 0; index < tokens.length; index += 1) {
      const current = tokens[index];
      const prev = index > 0 ? tokens[index - 1] : null;
      const next = index < tokens.length - 1 ? tokens[index + 1] : null;

      if (current.type === 'lparen') {
        balance += 1;
        if (prev && isOperandEnd(prev.type)) {
          // Implicit AND is allowed (e.g., A(B+C)).
        }
      }

      if (current.type === 'rparen') {
        balance -= 1;
        if (balance < 0) {
          return 'Unbalanced parentheses';
        }
        if (prev && (prev.type === 'or' || prev.type === 'and' || prev.type === 'lparen')) {
          return 'Empty or invalid term inside parentheses';
        }
      }

      if (current.type === 'or' || current.type === 'and') {
        if (!prev || !next) {
          return 'Expression cannot start or end with an operator';
        }
        if (!isOperandEnd(prev.type) || !isOperandStart(next.type)) {
          return 'Invalid operator placement';
        }
      }

      if (current.type === 'not') {
        if (!prev || prev.type !== 'label') {
          return "Apostrophe (') must come immediately after a variable";
        }
      }

      if (current.type === 'label' && prev && prev.type === 'rparen') {
        // Implicit AND is allowed (e.g., (A+B)C).
      }
    }

    if (balance !== 0) {
      return 'Unbalanced parentheses';
    }

    const lastToken = tokens[tokens.length - 1];
    if (lastToken.type === 'or' || lastToken.type === 'and' || lastToken.type === 'lparen') {
      return 'Expression cannot end with an operator or open parenthesis';
    }

    return null;
  };

  const validationError = useMemo(() => validateExpression(expression), [expression, labels]);

  useEffect(() => {
    setError(validationError);
  }, [validationError]);

  useEffect(() => {
    if (!expression.trim()) {
      setCanonicalForm(null);
      return;
    }

    if (validationError) {
      setCanonicalForm(null);
      return;
    }

    setCanonicalForm(
      normalizeFromExpression(expression, count, labels, format === 'SOP'),
    );
  }, [expression, format, count, labels, setCanonicalForm, validationError]);

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="font-semibold text-sm">Available Variables:</span>
          {labels.map((label, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => handleInsert(label)}
              className="font-mono h-8"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Expression Format</Label>
        <RadioGroup
          value={format}
          onValueChange={(v) => setFormat(v as 'SOP' | 'POS')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="SOP" id="sop" />
            <Label htmlFor="sop" className="cursor-pointer">
              SOP (Sum of Products)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="POS" id="pos" />
            <Label htmlFor="pos" className="cursor-pointer">
              POS (Product of Sums)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expression" className="text-sm font-medium">
          Boolean Expression
        </Label>
        <div className="flex gap-2 mb-2">
          {operatorButtons.map((op) => (
            <Button
              key={op.symbol}
              variant="outline"
              size="sm"
              onClick={() => handleInsert(op.symbol)}
              className={cn('font-mono h-8 px-3', op.className)}
            >
              {op.symbol}
            </Button>
          ))}
        </div>
        <Textarea
          id="expression"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder={format === 'SOP' 
            ? `e.g., ${sopExample}`
            : `e.g., ${posExample}`}
          className="font-mono min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground">
          Use ' for NOT (complement), + for OR, · or adjacent terms for AND
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {expression && !error && (
        <div className="bg-card border border-border rounded-lg p-4">
          <span className="text-sm text-muted-foreground">Preview: </span>
          <span className="font-mono text-foreground">F = {expression}</span>
        </div>
      )}
    </div>
  );
}
