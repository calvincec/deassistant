import React from 'react';
import { useAppStore } from '@/store/appStore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SolverMethod, OutputFormat } from '@/types/logic';
import { Grid3X3, Table2, ArrowRightLeft } from 'lucide-react';

export function SolverSelector() {
  const { solverMethod, setSolverMethod, outputFormat, setOutputFormat } = useAppStore();

  return (
    <div className="space-y-6">
      {/* Solver Method */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Simplification Method</Label>
        <div className="grid grid-cols-2 gap-4">
          <SolverCard
            method="kmap"
            title="K-Map Method"
            description="Visual grouping approach using Karnaugh map"
            icon={<Grid3X3 className="w-5 h-5" />}
            selected={solverMethod === 'kmap'}
            onClick={() => setSolverMethod('kmap')}
          />
          <SolverCard
            method="qmc"
            title="Quine-McCluskey"
            description="Tabular method with systematic implicant finding"
            icon={<Table2 className="w-5 h-5" />}
            selected={solverMethod === 'qmc'}
            onClick={() => setSolverMethod('qmc')}
          />
        </div>
      </div>

      {/* Output Format */}
      <div className="space-y-4">
        <Label className="text-sm font-medium flex items-center gap-2">
          Output Format
          <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
        </Label>
        <RadioGroup
          value={outputFormat}
          onValueChange={(v) => setOutputFormat(v as OutputFormat)}
          className="flex gap-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="SOP" id="sop-output" />
            <Label htmlFor="sop-output" className="cursor-pointer">
              <span className="font-medium">SOP</span>
              <span className="text-muted-foreground ml-1">(Sum of Products)</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="POS" id="pos-output" />
            <Label htmlFor="pos-output" className="cursor-pointer">
              <span className="font-medium">POS</span>
              <span className="text-muted-foreground ml-1">(Product of Sums)</span>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

interface SolverCardProps {
  method: SolverMethod;
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}

function SolverCard({ method, title, description, icon, selected, onClick }: SolverCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border-2 text-left transition-all duration-200',
        'hover:border-accent hover:bg-accent/5',
        selected
          ? 'border-accent bg-accent/10'
          : 'border-border bg-card'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
        selected ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {icon}
      </div>
      <div className="font-semibold text-foreground">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{description}</div>
    </button>
  );
}
