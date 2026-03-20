import React, { useEffect, useState } from 'react';
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

  const validateExpression = (): boolean => {
    if (!expression.trim()) {
      setError('Expression is empty');
      return false;
    }

    // Check for balanced parentheses
    let balance = 0;
    for (const char of expression) {
      if (char === '(') balance++;
      if (char === ')') balance--;
      if (balance < 0) {
        setError('Unbalanced parentheses');
        return false;
      }
    }
    if (balance !== 0) {
      setError('Unbalanced parentheses');
      return false;
    }

    setError(null);
    return true;
  };

  useEffect(() => {
    if (!expression.trim()) {
      setCanonicalForm(null);
      return;
    }

    if (!validateExpression()) {
      setCanonicalForm(null);
      return;
    }

    setCanonicalForm(
      normalizeFromExpression(expression, count, labels, format === 'SOP'),
    );
  }, [expression, format, count, labels, setCanonicalForm]);

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
          onBlur={validateExpression}
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
