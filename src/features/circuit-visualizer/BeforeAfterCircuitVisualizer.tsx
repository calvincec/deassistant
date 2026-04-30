import React, { useMemo, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { expressionToNetlist } from './parser';
import { useDigitalJS } from './useDigitalJS';
import type { DigitalJSNetlist } from './types';
import { useAppStore } from '@/store/appStore';
import './styles.css';

interface Props {
  originalExpression: string; // canonical (before)
  minimizedExpression: string; // after
}

import type { DigitalJSDevice } from './types';

function countGates(netlist: DigitalJSNetlist | null): number {
  if (!netlist || !netlist.devices) return 0;
  const gateTypes = new Set<DigitalJSDevice['type']>(['And', 'Or', 'Not']);
  return Object.values(netlist.devices).filter((d) => gateTypes.has(d.type)).length;
}

export function BeforeAfterCircuitVisualizer({ originalExpression, minimizedExpression }: Props) {
  const { variableConfig } = useAppStore();

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

  const beforeRef = useRef<HTMLDivElement | null>(null);
  const afterRef = useRef<HTMLDivElement | null>(null);

  const beforeState = useDigitalJS(beforeRef, netlistBefore);
  const afterState = useDigitalJS(afterRef, netlistAfter);

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
        <Tabs defaultValue="after">
          <TabsList>
            <TabsTrigger value="before">Before</TabsTrigger>
            <TabsTrigger value="after">After</TabsTrigger>
          </TabsList>

          <div className="mt-3 space-y-3">
            <TabsContent value="before">
              <div className="flex items-center justify-between">
                <pre className="rounded-md bg-muted/30 p-2 text-sm font-mono overflow-x-auto">{originalExpression}</pre>
                <div className="ml-3" />
              </div>

              <div className="relative rounded-xl border border-border bg-background/70 p-3 shadow-inner min-h-[18rem]">
                <div className="circuit-visualizer-surface relative min-h-[18rem] overflow-hidden rounded-lg bg-muted/20">
                  <div ref={beforeRef} className="circuit-visualizer-canvas absolute inset-0" />
                  {beforeState.status !== 'ready' && !beforeError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-sm">
                      <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
                        Rendering circuit…
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="after">
              <div className="mb-3 flex items-center justify-between">
                <pre className="rounded-md bg-muted/30 p-2 text-sm font-mono overflow-x-auto">{minimizedExpression}</pre>
                <div className="ml-3" />
              </div>

              <div className="relative rounded-xl border border-border bg-background/70 p-3 shadow-inner min-h-[18rem]">
                <div className="circuit-visualizer-surface relative min-h-[18rem] overflow-hidden rounded-lg bg-muted/20">
                  <div ref={afterRef} className="circuit-visualizer-canvas absolute inset-0" />
                  {afterState.status !== 'ready' && !afterError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-sm">
                      <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
                        Rendering circuit…
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default BeforeAfterCircuitVisualizer;
