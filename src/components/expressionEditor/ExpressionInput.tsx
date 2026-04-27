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
import { parseBooleanExpression } from '@/logic/expression/expressionEngine';

const operatorButtons = [
  { symbol: '+', label: 'OR', className: 'bg-accent/20 hover:bg-accent/30 text-accent' },
  { symbol: '·', label: 'AND', className: 'bg-primary/20 hover:bg-primary/30 text-primary' },
  { symbol: "'", label: 'NOT', className: 'bg-destructive/20 hover:bg-destructive/30 text-destructive' },
  { symbol: ' XOR ', label: 'XOR', className: 'bg-indigo-200/40 hover:bg-indigo-200/60 text-indigo-700' },
  { symbol: ' NAND ', label: 'NAND', className: 'bg-amber-200/40 hover:bg-amber-200/60 text-amber-700' },
  { symbol: ' NOR ', label: 'NOR', className: 'bg-emerald-200/40 hover:bg-emerald-200/60 text-emerald-700' },
  { symbol: '(', label: '(', className: 'bg-muted hover:bg-muted/80 text-muted-foreground' },
  { symbol: ')', label: ')', className: 'bg-muted hover:bg-muted/80 text-muted-foreground' },
];

export function ExpressionInput() {
  const { variableConfig, expressionInput, setExpressionInput, setCanonicalForm } = useAppStore();
  const { count, labels } = variableConfig;

  const [format, setFormat] = useState<'SOP' | 'POS'>('SOP');
  const [error, setError] = useState<string | null>(null);

  const handleInsert = (symbol: string) => {
    setExpressionInput((() => {
      const prev = expressionInput;
      const previousChar = prev.slice(-1);
      const startsLikeVariable = /^[A-Za-z0-9_(]/.test(symbol.trimStart());
      const needsImplicitAnd =
        (startsLikeVariable || symbol.trimStart() === '(') && /[A-Za-z0-9_')]/.test(previousChar);

      return `${prev}${needsImplicitAnd ? '·' : ''}${symbol}`;
    })());
  };

  const [a, b, c] = labels;
  const sopExample = a && b && c
    ? `${a}'·${b} + ${a}·${c}' + ${b}·${c}`
    : "A'·B + A·C' + B·C";
  const posExample = a && b && c
    ? `(${a} + ${b})·(${a}' + ${c})·(${b} + ${c}')`
    : "(A + B)·(A' + C)·(B + C')";

  const validateExpression = (value: string): string | null => {
    if (!value.trim()) return 'Expression is empty';

    try {
      parseBooleanExpression(value, labels);
      return null;
    } catch (parseError) {
      if (parseError instanceof Error) {
        return parseError.message;
      }
      return 'Invalid expression format';
    }
  };

  const validationError = useMemo(() => validateExpression(expressionInput), [expressionInput, labels]);

  useEffect(() => {
    setError(validationError);
  }, [validationError]);

  useEffect(() => {
    if (!expressionInput.trim()) {
      setCanonicalForm(null);
      return;
    }

    if (validationError) {
      setCanonicalForm(null);
      return;
    }

    setCanonicalForm(
      normalizeFromExpression(expressionInput, count, labels, format === 'SOP'),
    );
  }, [expressionInput, format, count, labels, setCanonicalForm, validationError]);

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
          value={expressionInput}
          onChange={(e) => setExpressionInput(e.target.value)}
          placeholder={format === 'SOP' 
            ? `e.g., ${sopExample}`
            : `e.g., ${posExample}`}
          className="font-mono min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground">
          Supports ', +, ·, XOR, NAND, NOR, adjacency (implicit AND), and optional F = ... prefix
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {expressionInput && !error && (
        <div className="bg-card border border-border rounded-lg p-4">
          <span className="text-sm text-muted-foreground">Preview: </span>
          <span className="font-mono text-foreground">F = {expressionInput}</span>
        </div>
      )}
    </div>
  );
}
