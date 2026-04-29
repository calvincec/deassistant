import { useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { expressionToNetlist } from './parser';
import { useDigitalJS } from './useDigitalJS';
import { type CanonicalForm, type OutputFormat } from '@/types/logic';
import './styles.css';

interface CircuitVisualizerProps {
  canonical: CanonicalForm;
  minimizedExpression: string;
  outputFormat: OutputFormat;
}

function buildCanonicalExpression(canonical: CanonicalForm, outputFormat: OutputFormat): string {
  const { minterms, maxterms, variableLabels, variableCount } = canonical;
  const totalTerms = 2 ** variableCount;

  if (outputFormat === 'SOP') {
    if (minterms.length === 0) return '0';
    if (minterms.length === totalTerms) return '1';

    return minterms
      .map((minterm) => buildSopTerm(minterm, variableLabels, variableCount))
      .join(' + ');
  }

  if (maxterms.length === 0) return '1';
  if (maxterms.length === totalTerms) return '0';

  return maxterms
    .map((maxterm) => buildPosTerm(maxterm, variableLabels, variableCount))
    .join(' · ');
}

function buildSopTerm(minterm: number, labels: string[], variableCount: number): string {
  const bits = minterm.toString(2).padStart(variableCount, '0');
  const literals = bits
    .split('')
    .map((bit, index) => (bit === '1' ? labels[index] : `${labels[index]}'`));

  return literals.join('');
}

function buildPosTerm(maxterm: number, labels: string[], variableCount: number): string {
  const bits = maxterm.toString(2).padStart(variableCount, '0');
  const literals = bits
    .split('')
    .map((bit, index) => (bit === '0' ? labels[index] : `${labels[index]}'`));

  return `(${literals.join(' + ')})`;
}

export function CircuitVisualizer({ canonical, minimizedExpression, outputFormat }: CircuitVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'minimized' | 'initial'>('minimized');

  const { activeExpression, viewLabel } = useMemo(() => {
    const initialExpression = buildCanonicalExpression(canonical, outputFormat);
    return {
      activeExpression: viewMode === 'initial' ? initialExpression : minimizedExpression,
      viewLabel: viewMode === 'initial' ? 'Initial circuit' : 'Minimized circuit',
    };
  }, [canonical, minimizedExpression, outputFormat, viewMode]);

  const { netlist, parseError } = useMemo(() => {
    try {
      return {
        netlist: expressionToNetlist(`F = ${activeExpression}`, canonical.variableLabels),
        parseError: null as string | null,
      };
    } catch (cause) {
      return {
        netlist: null,
        parseError: cause instanceof Error ? cause.message : 'Unable to parse the boolean expression.',
      };
    }
  }, [activeExpression, canonical.variableLabels]);

  const digitalJsState = useDigitalJS(containerRef, netlist);
  const errorMessage = parseError ?? digitalJsState.error;
  const functionDisplay = `F = ${activeExpression}`;

  return (
    <Card className="circuit-visualizer-card overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Circuit Visualizer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => setViewMode(value === 'initial' ? 'initial' : 'minimized')}
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <ToggleGroupItem value="minimized" aria-label="Show minimized circuit">
              Minimized
            </ToggleGroupItem>
            <ToggleGroupItem value="initial" aria-label="Show initial circuit">
              Initial
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{viewLabel}</p>
            <p className="mt-1 break-words font-mono text-sm text-foreground">{functionDisplay}</p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Unable to render circuit</p>
              <p className="mt-1 text-destructive/90">{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-border bg-background/70 p-3 shadow-inner">
          <div className="circuit-visualizer-surface relative min-h-[22rem] overflow-hidden rounded-lg bg-muted/20">
            <div ref={containerRef} className="circuit-visualizer-canvas absolute inset-0" />

            {digitalJsState.status !== 'ready' && !errorMessage ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-sm">
                <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {digitalJsState.status === 'loading'
                    ? `Rendering ${viewLabel.toLowerCase()}…`
                    : 'Preparing circuit…'}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}