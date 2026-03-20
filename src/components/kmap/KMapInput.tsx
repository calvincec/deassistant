import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { CellValue } from '@/types/logic';
import { cn } from '@/lib/utils';
import { getGrayCodeOrder, normalizeFromKMap } from '@/logic/normalize/inputNormalizer';

export function KMapInput() {
  const { variableConfig, setCanonicalForm } = useAppStore();
  const { count, labels, defaultOutput } = variableConfig;
  
  const [grid, setGrid] = useState<CellValue[][]>([]);

  // Initialize grid based on variable count
  useEffect(() => {
    const rows = count <= 3 ? 2 : 4;
    const cols = count === 2 ? 2 : 4;
    const newGrid: CellValue[][] = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(defaultOutput as CellValue));
    setGrid(newGrid);
  }, [count, defaultOutput]);

  useEffect(() => {
    if (!grid.length) return;

    setCanonicalForm(normalizeFromKMap(grid, count, labels));
  }, [grid, count, labels, setCanonicalForm]);

  const handleCellClick = (row: number, col: number) => {
    const newGrid = [...grid.map(r => [...r])];
    const currentValue = newGrid[row][col];
    // Cycle: 0 -> 1 -> X -> 0
    if (currentValue === 0) newGrid[row][col] = 1;
    else if (currentValue === 1) newGrid[row][col] = 'X';
    else newGrid[row][col] = 0;
    setGrid(newGrid);
  };

  const getRowLabels = (): string[] => {
    if (count === 2) return ['0', '1'];
    if (count === 3) return ['0', '1'];
    return ['00', '01', '11', '10'];
  };

  const getColLabels = (): string[] => {
    if (count === 2) return ['0', '1'];
    return ['00', '01', '11', '10'];
  };

  const getRowVarLabel = (): string => {
    if (count === 2) return labels[0];
    if (count === 3) return labels[0];
    return labels.slice(0, 2).join('');
  };

  const getColVarLabel = (): string => {
    if (count === 2) return labels[1];
    if (count === 3) return labels.slice(1).join('');
    return labels.slice(2).join('');
  };

  const rowLabels = getRowLabels();
  const colLabels = getColLabels();
  const grayCode = getGrayCodeOrder(count);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="inline-block">
          {/* Column variable label */}
          <div className="flex justify-center mb-2">
            <span className="font-mono text-sm font-semibold text-muted-foreground px-12">
              {getColVarLabel()}
            </span>
          </div>

          {/* Column labels */}
          <div className="flex">
            <div className="w-10 h-10" />
            {colLabels.map((label, i) => (
              <div
                key={i}
                className="w-12 h-8 flex items-center justify-center font-mono text-sm font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid with row labels */}
          <div className="flex">
            {/* Row variable label */}
            <div className="flex flex-col justify-center pr-2">
              <span className="font-mono text-sm font-semibold text-muted-foreground transform -rotate-90 origin-center whitespace-nowrap">
                {getRowVarLabel()}
              </span>
            </div>

            {/* Row labels and cells */}
            <div>
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  <div className="w-8 h-12 flex items-center justify-center font-mono text-sm font-medium text-muted-foreground">
                    {rowLabels[rowIndex]}
                  </div>
                  {row.map((cell, colIndex) => {
                    const mintermIndex = rowIndex * row.length + colIndex;
                    const minterm = grayCode[mintermIndex];
                    return (
                      <button
                        key={colIndex}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        className={cn(
                          'kmap-cell relative group',
                          cell === 0 && 'value-0',
                          cell === 1 && 'value-1',
                          cell === 'X' && 'value-x'
                        )}
                        title={`Minterm ${minterm}`}
                      >
                        <span className="font-mono">
                          {cell === 'X' ? 'X' : cell}
                        </span>
                        <span className="absolute bottom-0.5 right-1 text-[10px] text-muted-foreground/50 font-mono">
                          {minterm}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-border bg-muted/50" />
          <span>0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-border bg-primary/10" />
          <span>1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-border bg-highlight-dontcare italic flex items-center justify-center text-[10px]">X</div>
          <span>Don't Care</span>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Click cells to cycle through values: 0 → 1 → X → 0
      </p>
    </div>
  );
}

export function useKMapGrid() {
  const { variableConfig } = useAppStore();
  const { count, defaultOutput } = variableConfig;
  
  const rows = count <= 3 ? 2 : 4;
  const cols = count === 2 ? 2 : 4;
  
  return Array(rows).fill(null).map(() => Array(cols).fill(defaultOutput as CellValue));
}
