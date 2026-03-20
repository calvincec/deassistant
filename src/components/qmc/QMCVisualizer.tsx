import React from 'react';
import { QMCStep, QMCStepData, Implicant } from '@/types/logic';
import { cn } from '@/lib/utils';
import { ArrowRight, Check } from 'lucide-react';

interface QMCVisualizerProps {
  step: QMCStep;
  variableLabels: string[];
}

export function QMCVisualizer({ step, variableLabels }: QMCVisualizerProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-sm text-muted-foreground leading-relaxed">
        {step.description}
      </div>

      <div className="overflow-x-auto">
        {renderStepData(step.data, variableLabels)}
      </div>
    </div>
  );
}

function renderStepData(data: QMCStepData, labels: string[]): React.ReactNode {
  switch (data.type) {
    case 'grouping':
      return <GroupingTable groups={data.groups} />;
    case 'combination':
      return <CombinationTable pairs={data.pairs} />;
    case 'primeImplicants':
      return <PrimeImplicantsList implicants={data.implicants} labels={labels} />;
    case 'chart':
      return <ImplicantChart chart={data.chart} minterms={data.minterms} implicants={data.implicants} labels={labels} />;
    case 'essential':
      return <EssentialImplicants essential={data.essential} remaining={data.remaining} labels={labels} />;
    case 'final':
      return <FinalExpression expression={data.expression} />;
    default:
      return null;
  }
}

function GroupingTable({ groups }: { groups: Record<number, { binary: string; minterms: number[] }[]> }) {
  const sortedKeys = Object.keys(groups).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {sortedKeys.map(ones => (
        <div key={ones} className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="bg-primary/10 px-4 py-2 font-medium text-sm">
            Group {ones} ({ones} one{ones !== 1 ? 's' : ''})
          </div>
          <div className="divide-y divide-border">
            {groups[ones].map((entry, idx) => (
              <div key={idx} className="px-4 py-2 flex items-center justify-between">
                <span className="font-mono">{entry.binary}</span>
                <span className="text-muted-foreground text-sm">
                  m({entry.minterms.join(', ')})
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CombinationTable({ pairs }: { pairs: { a: string; b: string; result: string; combined: number[] }[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-primary/10">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Term A</th>
            <th className="px-2 py-2"></th>
            <th className="px-4 py-2 text-left font-medium">Term B</th>
            <th className="px-2 py-2"></th>
            <th className="px-4 py-2 text-left font-medium">Result</th>
            <th className="px-4 py-2 text-left font-medium">Covers</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pairs.map((pair, idx) => (
            <tr key={idx} className="hover:bg-muted/30">
              <td className="px-4 py-2 font-mono">{pair.a}</td>
              <td className="px-2 py-2 text-muted-foreground">+</td>
              <td className="px-4 py-2 font-mono">{pair.b}</td>
              <td className="px-2 py-2">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </td>
              <td className="px-4 py-2 font-mono font-semibold text-accent">{pair.result}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {'{' + pair.combined.join(', ') + '}'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrimeImplicantsList({ implicants, labels }: { implicants: Implicant[]; labels: string[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {implicants.map((imp, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-lg p-4 hover:border-accent transition-colors"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-lg font-semibold text-foreground">
                {describeTerm(imp.binary, labels)}
              </div>
              <div className="text-sm text-muted-foreground mt-1 font-mono">
                {imp.binary}
              </div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              P{idx + 1}
            </span>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Covers: {'{' + imp.minterms.join(', ') + '}'}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImplicantChart({ chart, minterms, implicants, labels }: { 
  chart: boolean[][]; 
  minterms: number[]; 
  implicants: Implicant[];
  labels: string[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="truth-table text-sm">
        <thead>
          <tr>
            <th className="rounded-tl-lg">Implicant</th>
            {minterms.map(m => (
              <th key={m}>m{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {implicants.map((imp, impIdx) => (
            <tr key={impIdx}>
              <td className="font-mono font-medium text-left">
                {describeTerm(imp.binary, labels)}
              </td>
              {chart[impIdx]?.map((covers, termIdx) => (
                <td key={termIdx}>
                  {covers && (
                    <Check className="w-4 h-4 text-accent mx-auto" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EssentialImplicants({ essential, remaining, labels }: {
  essential: Implicant[];
  remaining: number[];
  labels: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Check className="w-5 h-5 text-accent" />
          Essential Prime Implicants
        </h4>
        <div className="flex flex-wrap gap-2">
          {essential.map((imp, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-accent text-accent-foreground rounded-full font-mono text-sm"
            >
              {describeTerm(imp.binary, labels)}
            </span>
          ))}
        </div>
      </div>

      {remaining.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-medium text-muted-foreground mb-2">
            Remaining uncovered minterms: {'{' + remaining.join(', ') + '}'}
          </h4>
          <p className="text-sm text-muted-foreground">
            Additional implicants may be needed to cover these terms.
          </p>
        </div>
      )}
    </div>
  );
}

function FinalExpression({ expression }: { expression: string }) {
  return (
    <div className="bg-card border-2 border-accent rounded-xl p-6 text-center">
      <div className="text-sm text-muted-foreground mb-2">Simplified Expression</div>
      <div className="text-2xl font-mono font-bold text-foreground">
        F = {expression}
      </div>
    </div>
  );
}

function describeTerm(binary: string, labels: string[]): string {
  let term = '';
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      term += labels[i];
    } else if (binary[i] === '0') {
      term += labels[i] + "'";
    }
  }
  return term || '1';
}
