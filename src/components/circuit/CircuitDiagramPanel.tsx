import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { generateCircuitModel } from '@/logic/circuit/circuitModel';
import { useAppStore } from '@/store/appStore';
import { Maximize2, X } from 'lucide-react';
import { CircuitGate, CircuitModel, OutputFormat } from '@/types/logic';

type LayoutNode = {
  id: string;
  label: string;
  type: CircuitGate['type'];
  x: number;
  y: number;
  width: number;
  height: number;
  inputCount: number;
  outputCount: number;
};

type LayoutPort = {
  x: number;
  y: number;
};

type LayoutConnection = {
  from: string;
  to: string;
  fromPort: LayoutPort;
  toPort: LayoutPort;
};

type DiagramContentProps = {
  compact?: boolean;
};

const NODE_WIDTH = 132;
const NODE_HEIGHT = 52;
const SYMBOL_WIDTH = 88;
const SYMBOL_HEIGHT = 64;
const INPUT_WIDTH = 76;
const INPUT_HEIGHT = 34;
const STAGE_GAP = 210;
const ROW_GAP = 76;
const TOP_PADDING = 44;
const LEFT_PADDING = 28;
const CONNECTOR_OFFSET = 18;

export const CircuitDiagramPanel = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">Final Realized Circuit</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(true)}
            className="h-8 w-8"
            title="Maximize diagram"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <DiagramContent compact />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pb-2">
            <DialogTitle>Final Realized Circuit - Full View</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="w-full h-full p-4">
              <DiagramContent />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

function DiagramContent({ compact = false }: DiagramContentProps) {
  const { result, canonicalForm, outputFormat, variableConfig } = useAppStore();

  const circuitModel = useMemo(() => {
    if (!result || !canonicalForm) return null;

    const variableLabels = canonicalForm.variableLabels.length > 0
      ? canonicalForm.variableLabels
      : variableConfig.labels;

    return generateCircuitModel(
      result.expression,
      result.essentialImplicants,
      variableLabels,
      outputFormat
    );
  }, [canonicalForm, outputFormat, result, variableConfig.labels]);

  if (!circuitModel || !result) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-muted-foreground/25">
        <div className="text-center space-y-2 px-6">
          <p className="text-sm text-muted-foreground">
            Solve a function to generate the circuit diagram.
          </p>
          <p className="text-xs text-muted-foreground/60">
            The realized circuit will be drawn as AND and OR gate stages.
          </p>
        </div>
      </div>
    );
  }

  const layout = buildLayout(circuitModel);

  return (
    <div className="space-y-4 h-full">
      <div className="rounded-lg border bg-card/70 px-4 py-3 shadow-sm">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
          {outputFormat === 'SOP' ? 'Sum of Products' : 'Product of Sums'}
        </div>
        <div className="font-mono text-sm sm:text-base break-all text-foreground">
          F = {formatDisplayExpression(result.expression)}
        </div>
      </div>

      <div className={cn(
        'relative overflow-auto rounded-xl border bg-gradient-to-br from-background via-background to-muted/20',
        compact ? 'min-h-[16rem]' : 'min-h-[24rem]'
      )}>
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
        >
          <defs>
            <marker
              id="circuit-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>

          {layout.connections.map((connection) => {
            const path = buildConnectionPath(connection.fromPort, connection.toPort);

            return path ? (
              <path
                key={`${connection.from}-${connection.to}`}
                d={path}
                className="text-muted-foreground/70"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#circuit-arrow)"
              />
            ) : null;
          })}
        </svg>

        <div className="relative" style={{ width: layout.width, height: layout.height }}>
          {layout.nodes.map((node) => (
            <div
              key={node.id}
              className="absolute select-none"
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
              }}
            >
              {renderGateSymbol(node)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDisplayExpression(expression: string): string {
  if (expression === '0' || expression === '1') return expression;
  return expression.replace(/\s*·\s*/g, '').replace(/\s*\+\s*/g, '+');
}

function buildLayout(model: CircuitModel) {
  const inputGates = model.gates.filter((gate) => gate.type === 'INPUT');
  const notGates = model.gates.filter((gate) => gate.type === 'NOT');
  const termGates = model.gates.filter((gate) =>
    (gate.type === 'AND' || gate.type === 'OR') && !gate.id.endsWith('_final')
  );
  const finalGate = model.gates.find((gate) => gate.id.endsWith('_final'));
  const outputGate = model.gates.find((gate) => gate.type === 'OUTPUT');

  const rowCount = Math.max(inputGates.length, notGates.length, termGates.length, finalGate ? 1 : 0, outputGate ? 1 : 0, 1);
  const width = LEFT_PADDING + STAGE_GAP * 4 + NODE_WIDTH + 72;
  const height = TOP_PADDING * 2 + (rowCount - 1) * ROW_GAP + NODE_HEIGHT;

  const nodes: LayoutNode[] = [];
  const nodesByKey = new Map<string, LayoutNode>();
  const outputPortByWire = new Map<string, LayoutPort>();
  const inputPortsByGate = new Map<string, LayoutPort[]>();

  const pushNode = (node: LayoutNode) => {
    nodes.push(node);
    nodesByKey.set(node.id, node);
  };

  inputGates.forEach((gate, index) => {
    const node = makeNode(gate.id, gate.label ?? gate.output, gate.type, 0, TOP_PADDING + index * ROW_GAP, 0, 1);
    pushNode(node);
    outputPortByWire.set(gate.output, getOutputPort(node));
  });

  notGates.forEach((gate, index) => {
    const labelBase = gate.label?.replace(/'/g, '');
    const matchedInput = inputGates.findIndex((input) => input.label === labelBase || input.output === `wire_${labelBase}`);
    const y = matchedInput >= 0 ? TOP_PADDING + matchedInput * ROW_GAP : TOP_PADDING + index * ROW_GAP;
    const node = makeNode(gate.id, gate.label ?? gate.output, gate.type, 1, y, 1, 1);
    pushNode(node);
    inputPortsByGate.set(gate.id, [getInputPort(node, 0)]);
    outputPortByWire.set(gate.output, getOutputPort(node));
  });

  termGates.forEach((gate, index) => {
    const inputCount = Math.max(gate.inputs.length, 2);
    const node = makeNode(gate.id, gate.label ?? gate.output, gate.type, 2, TOP_PADDING + index * ROW_GAP, inputCount, 1);
    pushNode(node);
    inputPortsByGate.set(gate.id, Array.from({ length: inputCount }, (_, inputIndex) => getInputPort(node, inputIndex)));
    outputPortByWire.set(gate.output, getOutputPort(node));
  });

  const terminalY = TOP_PADDING + ((Math.max(termGates.length, 1) - 1) * ROW_GAP) / 2;
  if (finalGate) {
    const inputCount = Math.max(finalGate.inputs.length, 1);
    const node = makeNode(finalGate.id, finalGate.label ?? finalGate.output, finalGate.type, 3, terminalY, inputCount, 1);
    pushNode(node);
    inputPortsByGate.set(finalGate.id, Array.from({ length: inputCount }, (_, inputIndex) => getInputPort(node, inputIndex)));
    outputPortByWire.set(finalGate.output, getOutputPort(node));
  }

  if (outputGate) {
    const node = makeNode(outputGate.id, outputGate.label ?? outputGate.output, outputGate.type, 4, terminalY, Math.max(outputGate.inputs.length, 1), 1);
    pushNode(node);
    inputPortsByGate.set(outputGate.id, [getInputPort(node, 0)]);
  }

  model.gates.forEach((gate) => {
    if (gate.type === 'INPUT') return;
    if (gate.output) {
      const node = nodesByKey.get(gate.id);
      if (node) {
        outputPortByWire.set(gate.output, getOutputPort(node));
      }
    }
  });

  const connections: LayoutConnection[] = [];
  const inputUseCount = new Map<string, number>();

  model.connections.forEach((connection) => {
    const fromPort = resolveSourcePort(connection.from, nodesByKey, outputPortByWire);
    const targetNode = resolveTargetNode(connection.to, nodesByKey);
    const targetPorts = targetNode ? inputPortsByGate.get(targetNode.id) ?? [] : [];
    const inputIndex = inputUseCount.get(connection.to) ?? 0;
    const toPort = targetPorts[Math.min(inputIndex, Math.max(targetPorts.length - 1, 0))] ?? resolveFallbackTargetPort(targetNode);

    inputUseCount.set(connection.to, inputIndex + 1);

    if (fromPort && toPort) {
      connections.push({
        from: connection.from,
        to: connection.to,
        fromPort,
        toPort,
      });
    }
  });

  return {
    nodes,
    nodesByKey,
    connections,
    width,
    height,
  };
}

function makeNode(
  id: string,
  label: string,
  type: CircuitGate['type'],
  stageIndex: number,
  y: number,
  inputCount: number,
  outputCount: number
): LayoutNode {
  const dimensions = getNodeDimensions(type);

  return {
    id,
    label,
    type,
    x: LEFT_PADDING + stageIndex * STAGE_GAP,
    y,
    width: dimensions.width,
    height: dimensions.height,
    inputCount,
    outputCount,
  };
}

function buildConnectionPath(fromPort: LayoutPort, toPort: LayoutPort): string {
  const startX = fromPort.x;
  const startY = fromPort.y;
  const endX = toPort.x;
  const endY = toPort.y;

  const bendX = Math.max(startX + CONNECTOR_OFFSET, endX - CONNECTOR_OFFSET);

  if (Math.abs(startY - endY) < 2) {
    return `M ${startX} ${startY} H ${endX}`;
  }

  return `M ${startX} ${startY} H ${bendX} V ${endY} H ${endX}`;
}

function gateTone(type: CircuitGate['type']): string {
  switch (type) {
    case 'INPUT':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100';
    case 'NOT':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100';
    case 'AND':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
    case 'OR':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-950 dark:text-violet-100';
    case 'OUTPUT':
      return 'border-accent/40 bg-accent/10 text-foreground';
    default:
      return 'border-border bg-card text-foreground';
  }
}

function getNodeDimensions(type: CircuitGate['type']) {
  switch (type) {
    case 'INPUT':
      return { width: INPUT_WIDTH, height: INPUT_HEIGHT };
    case 'OUTPUT':
      return { width: INPUT_WIDTH, height: INPUT_HEIGHT };
    default:
      return { width: SYMBOL_WIDTH, height: SYMBOL_HEIGHT };
  }
}

function getInputPort(node: LayoutNode, index: number): LayoutPort {
  if (node.type === 'INPUT') {
    return { x: node.x, y: node.y + node.height / 2 };
  }

  if (node.type === 'OUTPUT') {
    return { x: node.x + 6, y: node.y + node.height / 2 };
  }

  if (node.type === 'NOT') {
    return { x: node.x, y: node.y + node.height / 2 };
  }

  const totalInputs = Math.max(node.inputCount, 2);
  const step = node.height / (totalInputs + 1);
  return {
    x: node.x,
    y: node.y + step * (index + 1),
  };
}

function getOutputPort(node: LayoutNode): LayoutPort {
  if (node.type === 'INPUT') {
    return {
      x: node.x + node.width - 8,
      y: node.y + node.height / 2,
    };
  }

  if (node.type === 'NOT' || node.type === 'AND' || node.type === 'OR') {
    return {
      x: node.x + node.width + 28,
      y: node.y + node.height / 2,
    };
  }

  return {
    x: node.x + node.width,
    y: node.y + node.height / 2,
  };
}

function resolveSourcePort(
  from: string,
  nodesByKey: Map<string, LayoutNode>,
  outputPortByWire: Map<string, LayoutPort>
): LayoutPort | null {
  const portByWire = outputPortByWire.get(from);
  if (portByWire) return portByWire;

  const node = nodesByKey.get(from);
  if (node) return getOutputPort(node);

  if (from === 'vcc' || from === 'gnd') {
    return null;
  }

  return null;
}

function resolveTargetNode(to: string, nodesByKey: Map<string, LayoutNode>): LayoutNode | null {
  return nodesByKey.get(to) ?? null;
}

function resolveFallbackTargetPort(node: LayoutNode | null): LayoutPort | null {
  if (!node) return null;
  return {
    x: node.x,
    y: node.y + node.height / 2,
  };
}

function renderGateSymbol(node: LayoutNode) {
  const strokeClass = strokeTone(node.type);
  const label = node.type === 'OUTPUT' ? 'F' : node.label;

  return (
    <svg
      width={node.width}
      height={node.height}
      viewBox={`0 0 ${node.width} ${node.height}`}
      className="overflow-visible"
      aria-label={`${node.type} gate ${label}`}
      role="img"
    >
      {node.type !== 'INPUT' && node.type !== 'OUTPUT' && (
        <>
          {renderGateBody(node.type, node.width, node.height, strokeClass)}
          {renderGateInputs(node, strokeClass)}
          {renderGateOutput(node, strokeClass)}
        </>
      )}

      {node.type === 'INPUT' && (
        <>
          <circle cx="12" cy={node.height / 2} r="4" className={strokeClass} fill="currentColor" />
          <path d={`M 16 ${node.height / 2} H ${node.width - 10}`} className={strokeClass} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <text x={node.width / 2} y={node.height / 2 + 4} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
            {label}
          </text>
        </>
      )}

      {node.type === 'OUTPUT' && (
        <>
          <path d={`M 6 ${node.height / 2} H ${node.width - 14}`} className={strokeClass} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx={6} cy={node.height / 2} r="4" className={strokeClass} fill="currentColor" />
          <text x={node.width / 2} y={node.height / 2 + 4} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
            {label}
          </text>
        </>
      )}
    </svg>
  );
}

function renderGateBody(type: CircuitGate['type'], width: number, height: number, strokeClass: string) {
  const fillClass = fillTone(type);

  if (type === 'AND') {
    const left = 10;
    const right = width - 16;
    const top = 12;
    const bottom = height - 12;

    return (
      <path
        d={`M ${left} ${top} H ${right - 18} A 18 18 0 0 1 ${right - 18} ${bottom} H ${left} Z`}
        className={cn(strokeClass, fillClass)}
        stroke="currentColor"
        strokeWidth="2.4"
      />
    );
  }

  if (type === 'OR') {
    return (
      <path
        d={`M 12 ${height - 10} Q 30 ${height / 2} 12 10 Q 42 12 68 ${height / 2} Q 42 ${height - 12} 12 ${height - 10} Z`}
        className={cn(strokeClass, fillClass)}
        stroke="currentColor"
        strokeWidth="2.4"
      />
    );
  }

  if (type === 'NOT') {
    return (
      <>
        <path
          d={`M 12 ${height - 12} L 48 ${height / 2} L 12 12 Z`}
          className={cn(strokeClass, fillClass)}
          stroke="currentColor"
          strokeWidth="2.4"
        />
        <circle cx="56" cy={height / 2} r="5" className={strokeClass} fill="currentColor" />
      </>
    );
  }

  return null;
}

function renderGateInputs(node: LayoutNode, strokeClass: string) {
  const { type, width, height, inputCount } = node;

  if (type === 'NOT') {
    return (
      <path
        d={`M 0 ${height / 2} H 12`}
        className={strokeClass}
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    );
  }

  if (type === 'AND' || type === 'OR') {
    const count = Math.max(inputCount, 2);
    const step = height / (count + 1);
    const inputYs = Array.from({ length: count }, (_, index) => step * (index + 1));

    return (
      <>
        {inputYs.map((inputY, index) => (
          <path
            key={`${type}-input-${index}`}
            d={`M 0 ${inputY} H 14`}
            className={strokeClass}
            stroke="currentColor"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </>
    );
  }

  return null;
}

function renderGateOutput(node: LayoutNode, strokeClass: string) {
  const { type, width, height } = node;

  if (type === 'AND' || type === 'OR') {
    return (
      <path
        d={`M ${width - 2} ${height / 2} H ${width + 28}`}
        className={strokeClass}
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    );
  }

  if (type === 'NOT') {
    return (
      <path
        d={`M ${width - 2} ${height / 2} H ${width + 28}`}
        className={strokeClass}
        stroke="currentColor"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    );
  }

  return null;
}

function strokeTone(type: CircuitGate['type']): string {
  switch (type) {
    case 'INPUT':
      return 'text-sky-500';
    case 'NOT':
      return 'text-amber-500';
    case 'AND':
      return 'text-emerald-500';
    case 'OR':
      return 'text-violet-500';
    case 'OUTPUT':
      return 'text-accent';
    default:
      return 'text-foreground';
  }
}

function fillTone(type: CircuitGate['type']): string {
  switch (type) {
    case 'AND':
      return 'fill-emerald-500/10';
    case 'OR':
      return 'fill-violet-500/10';
    case 'NOT':
      return 'fill-amber-500/10';
    default:
      return 'fill-background';
  }
}
