import React from 'react';
import { useAppStore } from '@/store/appStore';
import { Grid3X3, Table, FileText, Hash, Binary } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InputMethod } from '@/types/logic';

const inputMethods: { id: InputMethod; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: 'kmap', 
    label: 'K-Map Grid', 
    icon: <Grid3X3 className="w-4 h-4" />,
    description: 'Fill cells directly in the Karnaugh map'
  },
  { 
    id: 'truthTable', 
    label: 'Truth Table', 
    icon: <Table className="w-4 h-4" />,
    description: 'Enter outputs in a truth table format'
  },
  { 
    id: 'minterms', 
    label: 'Minterms', 
    icon: <Hash className="w-4 h-4" />,
    description: 'List minterm indices (Σm notation)'
  },
  { 
    id: 'maxterms', 
    label: 'Maxterms', 
    icon: <Binary className="w-4 h-4" />,
    description: 'List maxterm indices (ΠM notation)'
  },
  { 
    id: 'expression', 
    label: 'Expression', 
    icon: <FileText className="w-4 h-4" />,
    description: 'Enter a Boolean expression'
  },
];

export function InputMethodSelector() {
  const { inputMethod, solverMethod, setInputMethod } = useAppStore();
  const visibleMethods = solverMethod === 'qmc'
    ? inputMethods.filter((method) => method.id !== 'kmap')
    : inputMethods;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Input Method</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {visibleMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => setInputMethod(method.id)}
            className={cn(
              'p-4 rounded-xl border-2 transition-all duration-200 text-left',
              'hover:border-accent hover:bg-accent/5',
              inputMethod === method.id
                ? 'border-accent bg-accent/10'
                : 'border-border bg-card'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center mb-2',
              inputMethod === method.id ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {method.icon}
            </div>
            <div className="font-medium text-sm text-foreground">{method.label}</div>
            <div className="text-xs text-muted-foreground mt-1 hidden md:block">
              {method.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
