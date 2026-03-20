import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { normalizeFromMaxterms, normalizeFromMinterms } from '@/logic/normalize/inputNormalizer';

export function MintermInput() {
  const { variableConfig, setCanonicalForm } = useAppStore();
  const { count, labels } = variableConfig;
  
  const [minterms, setMinterms] = useState('');
  const [dontCares, setDontCares] = useState('');
  const [error, setError] = useState<string | null>(null);

  const maxValue = Math.pow(2, count) - 1;

  const validateInput = (value: string, type: 'minterms' | 'dontcares'): number[] | null => {
    if (!value.trim()) return [];
    
    const terms = value.split(',').map(s => s.trim()).filter(Boolean);
    const parsed: number[] = [];
    
    for (const term of terms) {
      const num = parseInt(term);
      if (isNaN(num)) {
        setError(`Invalid value: "${term}"`);
        return null;
      }
      if (num < 0 || num > maxValue) {
        setError(`Value ${num} out of range (0-${maxValue})`);
        return null;
      }
      parsed.push(num);
    }
    
    // Check for duplicates
    const unique = new Set(parsed);
    if (unique.size !== parsed.length) {
      setError('Duplicate values detected');
      return null;
    }
    
    setError(null);
    return [...unique];
  };

  const handleMintermsChange = (value: string) => {
    setMinterms(value);
    validateInput(value, 'minterms');
  };

  const handleDontCaresChange = (value: string) => {
    setDontCares(value);
    validateInput(value, 'dontcares');
  };

  const parsedMinterms = validateInput(minterms, 'minterms');
  const parsedDontCares = validateInput(dontCares, 'dontcares');

  useEffect(() => {
    if (error || parsedMinterms === null || parsedDontCares === null) {
      setCanonicalForm(null);
      return;
    }

    setCanonicalForm(
      normalizeFromMinterms(parsedMinterms, parsedDontCares, count, labels),
    );
  }, [error, parsedMinterms, parsedDontCares, count, labels, setCanonicalForm]);

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span className="font-semibold">Valid Range:</span>
          <span className="font-mono">0 to {maxValue}</span>
          <span className="text-muted-foreground/60">({count} variables = {maxValue + 1} minterms)</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="font-semibold text-sm">Variables:</span>
          {labels.map((label, i) => (
            <Badge key={i} variant="secondary" className="font-mono">
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="minterms" className="text-sm font-medium">
            Minterms (Σm)
          </Label>
          <Input
            id="minterms"
            value={minterms}
            onChange={(e) => handleMintermsChange(e.target.value)}
            placeholder="e.g., 0, 1, 2, 5, 8, 10"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Enter comma-separated minterm indices where F = 1
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dontcares" className="text-sm font-medium">
            Don't Cares (d)
          </Label>
          <Input
            id="dontcares"
            value={dontCares}
            onChange={(e) => handleDontCaresChange(e.target.value)}
            placeholder="e.g., 3, 7"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Optional: Enter comma-separated don't care indices
          </p>
        </div>
      </div>

      {/* Validation feedback */}
      <div className="flex items-center gap-2">
        {error ? (
          <>
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </>
        ) : parsedMinterms && parsedMinterms.length > 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-step-complete" />
            <span className="text-sm text-muted-foreground">
              F = Σm({parsedMinterms.join(', ')})
              {parsedDontCares && parsedDontCares.length > 0 && ` + d(${parsedDontCares.join(', ')})`}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Enter minterms to continue</span>
        )}
      </div>
    </div>
  );
}

export function MaxtermInput() {
  const { variableConfig, setCanonicalForm } = useAppStore();
  const { count, labels } = variableConfig;
  
  const [maxterms, setMaxterms] = useState('');
  const [dontCares, setDontCares] = useState('');
  const [error, setError] = useState<string | null>(null);

  const maxValue = Math.pow(2, count) - 1;

  const validateInput = (value: string): number[] | null => {
    if (!value.trim()) return [];
    
    const terms = value.split(',').map(s => s.trim()).filter(Boolean);
    const parsed: number[] = [];
    
    for (const term of terms) {
      const num = parseInt(term);
      if (isNaN(num)) {
        setError(`Invalid value: "${term}"`);
        return null;
      }
      if (num < 0 || num > maxValue) {
        setError(`Value ${num} out of range (0-${maxValue})`);
        return null;
      }
      parsed.push(num);
    }
    
    const unique = new Set(parsed);
    if (unique.size !== parsed.length) {
      setError('Duplicate values detected');
      return null;
    }
    
    setError(null);
    return [...unique];
  };

  const parsedMaxterms = validateInput(maxterms);
  const parsedDontCares = validateInput(dontCares);

  useEffect(() => {
    if (error || parsedMaxterms === null || parsedDontCares === null) {
      setCanonicalForm(null);
      return;
    }

    setCanonicalForm(
      normalizeFromMaxterms(parsedMaxterms, parsedDontCares, count, labels),
    );
  }, [error, parsedMaxterms, parsedDontCares, count, labels, setCanonicalForm]);

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span className="font-semibold">Valid Range:</span>
          <span className="font-mono">0 to {maxValue}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="font-semibold text-sm">Variables:</span>
          {labels.map((label, i) => (
            <Badge key={i} variant="secondary" className="font-mono">
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="maxterms" className="text-sm font-medium">
            Maxterms (ΠM)
          </Label>
          <Input
            id="maxterms"
            value={maxterms}
            onChange={(e) => { setMaxterms(e.target.value); validateInput(e.target.value); }}
            placeholder="e.g., 0, 2, 4, 6"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Enter comma-separated maxterm indices where F = 0
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dc-maxterms" className="text-sm font-medium">
            Don't Cares (d)
          </Label>
          <Input
            id="dc-maxterms"
            value={dontCares}
            onChange={(e) => { setDontCares(e.target.value); validateInput(e.target.value); }}
            placeholder="e.g., 3, 7"
            className="font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {error ? (
          <>
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </>
        ) : parsedMaxterms && parsedMaxterms.length > 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-step-complete" />
            <span className="text-sm text-muted-foreground">
              F = ΠM({parsedMaxterms.join(', ')})
              {parsedDontCares && parsedDontCares.length > 0 && ` · d(${parsedDontCares.join(', ')})`}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Enter maxterms to continue</span>
        )}
      </div>
    </div>
  );
}
