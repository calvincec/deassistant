import { useMemo, useRef } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { expressionToNetlist } from './parser';
import { useDigitalJS } from './useDigitalJS';
import './styles.css';

interface CircuitVisualizerProps {
  expression: string;
}

export function CircuitVisualizer({ expression }: CircuitVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { netlist, parseError } = useMemo(() => {
    try {
      return {
        netlist: expressionToNetlist(expression),
        parseError: null as string | null,
      };
    } catch (cause) {
      return {
        netlist: null,
        parseError: cause instanceof Error ? cause.message : 'Unable to parse the boolean expression.',
      };
    }
  }, [expression]);

  const digitalJsState = useDigitalJS(containerRef, netlist);
  const errorMessage = parseError ?? digitalJsState.error;

  return (
    <Card className="circuit-visualizer-card overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Circuit Visualizer</CardTitle>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
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
                  {digitalJsState.status === 'loading' ? 'Rendering circuit…' : 'Preparing circuit…'}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}