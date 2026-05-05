import React, { useMemo, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { expressionToNetlist } from './parser';
import { useDigitalJS } from './useDigitalJS';
import type { DigitalJSNetlist } from './types';
import { useAppStore } from '@/store/appStore';
import { buildCanonicalSOP } from './canonicalExpression';
import type { CanonicalForm } from '@/types/logic';
import { AlertCircle, Loader2 } from 'lucide-react';
import './styles.css';

interface Props {
  canonicalForm: CanonicalForm;
  minimizedExpression: string; // after
}

import type { DigitalJSDevice } from './types';

function countGates(netlist: DigitalJSNetlist | null): number {
  if (!netlist || !netlist.devices) return 0;
  const gateTypes = new Set<DigitalJSDevice['type']>(['And', 'Or', 'Not']);
  return Object.values(netlist.devices).filter((d) => gateTypes.has(d.type)).length;
}

export function BeforeAfterCircuitVisualizer({ canonicalForm, minimizedExpression }: Props) {
  const { variableConfig } = useAppStore();
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');

  const originalExpression = useMemo(
    () => buildCanonicalSOP(canonicalForm),
    [canonicalForm],
  );

  const { netlistBefore, netlistAfter, beforeError, afterError } = useMemo(() => {
    try {
      const nb = expressionToNetlist(originalExpression, variableConfig.labels);
      const na = expressionToNetlist(minimizedExpression, variableConfig.labels);
      return { netlistBefore: nb, netlistAfter: na, beforeError: null, afterError: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Parse error';
      return { netlistBefore: null, netlistAfter: null, beforeError: msg, afterError: msg };
    }
  }, [originalExpression, minimizedExpression, variableConfig.labels]);

  const beforeGates = countGates(netlistBefore);
  const afterGates = countGates(netlistAfter);

  return (
    <Card className="circuit-visualizer-card overflow-hidden">
      <CardHeader className="flex items-center justify-between pb-3">
        <CardTitle className="text-lg">Circuit — Before / After</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">{`Gates: ${beforeGates} → ${afterGates}`}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'before' | 'after')}>
          <TabsList>
            <TabsTrigger value="before">Before</TabsTrigger>
            <TabsTrigger value="after">After</TabsTrigger>
          </TabsList>

          <div className="mt-3 space-y-3">
            <TabsContent value="before">
              {activeTab === 'before' ? (
                <CircuitPreview
                  title="Original expression"
                  expression={originalExpression}
                  netlist={netlistBefore}
                  errorMessage={beforeError}
                  loadingLabel="Rendering original circuit…"
                  emptyLabel="No circuit data available for the original expression."
                />
              ) : null}
            </TabsContent>

            <TabsContent value="after">
              {activeTab === 'after' ? (
                <CircuitPreview
                  title="Minimized expression"
                  expression={minimizedExpression}
                  netlist={netlistAfter}
                  errorMessage={afterError}
                  loadingLabel="Rendering minimized circuit…"
                  emptyLabel="No circuit data available for the minimized expression."
                />
              ) : null}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CircuitPreview({
  title,
  expression,
  netlist,
  errorMessage,
  loadingLabel,
  emptyLabel,
}: {
  title: string;
  expression: string;
  netlist: DigitalJSNetlist | null;
  errorMessage: string | null;
  loadingLabel: string;
  emptyLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const state = useDigitalJS(containerRef, netlist);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <pre className="max-w-full rounded-md bg-muted/30 p-2 text-sm font-mono overflow-x-auto whitespace-pre-wrap text-right">
          {expression}
        </pre>
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Unable to render circuit</p>
            <p className="mt-1 text-destructive/90">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      <div className="relative rounded-xl border border-border bg-background/70 p-3 shadow-inner min-h-[18rem]">
        <div className="circuit-visualizer-surface relative min-h-[18rem] overflow-hidden rounded-lg bg-muted/20">
          <div ref={containerRef} className="circuit-visualizer-canvas absolute inset-0" />

          {state.status !== 'ready' && !errorMessage ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {state.status === 'loading' ? loadingLabel : emptyLabel}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default BeforeAfterCircuitVisualizer;
