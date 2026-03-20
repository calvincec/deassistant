import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { normalizeFromMaxterms, normalizeFromMinterms } from '@/logic/normalize/inputNormalizer';

type ValidationResult = {
  parsed: number[];
  error: string | null;
};

function parseTermList(value: string, maxValue: number): ValidationResult {
  if (!value.trim()) {
    return { parsed: [], error: null };
  }

  const terms = value.split(',').map((s) => s.trim()).filter(Boolean);
  const parsed: number[] = [];

  for (const term of terms) {
    if (!/^\d+$/.test(term)) {
      return { parsed: [], error: `Invalid value: "${term}"` };
    }

    const num = Number(term);
    if (!Number.isInteger(num) || num < 0 || num > maxValue) {
      return { parsed: [], error: `Value ${num} out of range (0-${maxValue})` };
    }

    parsed.push(num);
  }

  const unique = new Set(parsed);
  if (unique.size !== parsed.length) {
    return { parsed: [], error: 'Duplicate values detected' };
  }

  return { parsed: [...unique], error: null };
}

export function MintermInput() {
  const { variableConfig, setCanonicalForm } = useAppStore();
  const { count, labels } = variableConfig;
  
  const [minterms, setMinterms] = useState('');
  const [dontCares, setDontCares] = useState('');

  const maxValue = Math.pow(2, count) - 1;

  const mintermResult = useMemo(() => parseTermList(minterms, maxValue), [minterms, maxValue]);
  const dontCareResult = useMemo(() => parseTermList(dontCares, maxValue), [dontCares, maxValue]);

  const overlap = useMemo(() => {
    const mintermSet = new Set(mintermResult.parsed);
    return dontCareResult.parsed.find((term) => mintermSet.has(term));
  }, [mintermResult.parsed, dontCareResult.parsed]);

  const error = mintermResult.error
    ?? dontCareResult.error
    ?? (overlap !== undefined ? `Value ${overlap} cannot be both minterm and don't care` : null);

  useEffect(() => {
    if (error) {
      setCanonicalForm(null);
      return;
    }

    setCanonicalForm(
      normalizeFromMinterms(mintermResult.parsed, dontCareResult.parsed, count, labels),
    );
  }, [error, mintermResult.parsed, dontCareResult.parsed, count, labels, setCanonicalForm]);

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
            onChange={(e) => setMinterms(e.target.value)}
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
            onChange={(e) => setDontCares(e.target.value)}
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
        ) : mintermResult.parsed.length > 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-step-complete" />
            <span className="text-sm text-muted-foreground">
              F = Σm({mintermResult.parsed.join(', ')})
              {dontCareResult.parsed.length > 0 && ` + d(${dontCareResult.parsed.join(', ')})`}
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

  const maxValue = Math.pow(2, count) - 1;

  const maxtermResult = useMemo(() => parseTermList(maxterms, maxValue), [maxterms, maxValue]);
  const dontCareResult = useMemo(() => parseTermList(dontCares, maxValue), [dontCares, maxValue]);

  const overlap = useMemo(() => {
    const maxtermSet = new Set(maxtermResult.parsed);
    return dontCareResult.parsed.find((term) => maxtermSet.has(term));
  }, [maxtermResult.parsed, dontCareResult.parsed]);

  const error = maxtermResult.error
    ?? dontCareResult.error
    ?? (overlap !== undefined ? `Value ${overlap} cannot be both maxterm and don't care` : null);

  useEffect(() => {
    if (error) {
      setCanonicalForm(null);
      return;
    }

    setCanonicalForm(
      normalizeFromMaxterms(maxtermResult.parsed, dontCareResult.parsed, count, labels),
    );
  }, [error, maxtermResult.parsed, dontCareResult.parsed, count, labels, setCanonicalForm]);

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
            onChange={(e) => setMaxterms(e.target.value)}
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
            onChange={(e) => setDontCares(e.target.value)}
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
        ) : maxtermResult.parsed.length > 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-step-complete" />
            <span className="text-sm text-muted-foreground">
              F = ΠM({maxtermResult.parsed.join(', ')})
              {dontCareResult.parsed.length > 0 && ` · d(${dontCareResult.parsed.join(', ')})`}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Enter maxterms to continue</span>
        )}
      </div>
    </div>
  );
}
