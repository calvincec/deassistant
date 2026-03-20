import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { TruthTableRow, CellValue } from '@/types/logic';
import { cn } from '@/lib/utils';
import { mintermToBinary, normalizeFromTruthTable } from '@/logic/normalize/inputNormalizer';

export function TruthTableInput() {
  const { variableConfig, setCanonicalForm } = useAppStore();
  const { count, labels, defaultOutput } = variableConfig;
  
  const [rows, setRows] = useState<TruthTableRow[]>([]);

  // Initialize truth table
  useEffect(() => {
    const totalRows = Math.pow(2, count);
    const newRows: TruthTableRow[] = [];
    
    for (let i = 0; i < totalRows; i++) {
      const binary = mintermToBinary(i, count);
      newRows.push({
        inputs: binary.split('').map(b => parseInt(b)),
        output: defaultOutput as CellValue,
        minterm: i,
      });
    }
    
    setRows(newRows);
  }, [count, defaultOutput]);

  useEffect(() => {
    if (!rows.length) return;

    setCanonicalForm(normalizeFromTruthTable(rows, count, labels));
  }, [rows, count, labels, setCanonicalForm]);

  const handleOutputClick = (index: number) => {
    const newRows = [...rows];
    const currentValue = newRows[index].output;
    // Cycle: 0 -> 1 -> X -> 0
    if (currentValue === 0) newRows[index].output = 1;
    else if (currentValue === 1) newRows[index].output = 'X';
    else newRows[index].output = 0;
    setRows(newRows);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="truth-table mx-auto">
          <thead>
            <tr>
              <th className="rounded-tl-lg">m</th>
              {labels.map((label, i) => (
                <th key={i}>{label}</th>
              ))}
              <th className="rounded-tr-lg">F</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group">
                <td className="text-muted-foreground bg-muted/20">{row.minterm}</td>
                {row.inputs.map((input, inputIndex) => (
                  <td key={inputIndex}>{input}</td>
                ))}
                <td>
                  <button
                    onClick={() => handleOutputClick(rowIndex)}
                    className={cn(
                      'w-full h-full py-2 px-4 transition-colors font-semibold',
                      row.output === 0 && 'text-muted-foreground',
                      row.output === 1 && 'text-primary bg-primary/10',
                      row.output === 'X' && 'text-muted-foreground italic bg-highlight-dontcare'
                    )}
                  >
                    {row.output === 'X' ? 'X' : row.output}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Click output cells to cycle through values: 0 → 1 → X → 0
      </p>
    </div>
  );
}
