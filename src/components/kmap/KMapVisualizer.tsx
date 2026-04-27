import React from 'react';
import { KMapStep, KMapGroup, CanonicalForm } from '@/types/logic';
import { cn } from '@/lib/utils';
import {
  getGrayCodeOrder,
  getKMapCellPosition,
  getKMapDimensions,
} from '@/logic/normalize/inputNormalizer';

interface KMapVisualizerProps {
  step: KMapStep;
  canonical: CanonicalForm;
}

export function KMapVisualizer({ step, canonical }: KMapVisualizerProps) {
  const { variableCount, variableLabels, minterms, dontCares } = canonical;
  const { rows, cols, rowBits, colBits } = getKMapDimensions(variableCount);
  const rowGray = getGrayCodeOrder(rowBits);
  const colGray = getGrayCodeOrder(colBits);

  const getRowLabels = (): string[] => {
    return rowGray.map((value) => value.toString(2).padStart(rowBits, '0'));
  };

  const getColLabels = (): string[] => {
    return colGray.map((value) => value.toString(2).padStart(colBits, '0'));
  };

  const getRowVarLabel = (): string => {
    return variableLabels.slice(0, rowBits).join('');
  };

  const getColVarLabel = (): string => {
    return variableLabels.slice(rowBits).join('');
  };

  const getCellValue = (minterm: number): string => {
    if (minterms.includes(minterm)) return '1';
    if (dontCares.includes(minterm)) return 'X';
    return '0';
  };

  const getCellGroupColors = (minterm: number): number[] => {
    return step.groups
      .filter(g => g.cells.includes(minterm))
      .map(g => g.color);
  };

  const isHighlighted = (minterm: number): boolean => {
    return step.highlightedCells.includes(minterm);
  };

  const rowLabels = getRowLabels();
  const colLabels = getColLabels();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="inline-block relative">
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
                className="w-14 h-8 flex items-center justify-center font-mono text-sm font-medium text-muted-foreground"
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
            <div className="relative">
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex">
                  <div className="w-8 h-14 flex items-center justify-center font-mono text-sm font-medium text-muted-foreground">
                    {rowLabels[rowIndex]}
                  </div>
                  {Array.from({ length: cols }).map((_, colIndex) => {
                    const minterm = parseInt(
                      `${rowGray[rowIndex].toString(2).padStart(rowBits, '0')}${colGray[colIndex].toString(2).padStart(colBits, '0')}`,
                      2,
                    );
                    const value = getCellValue(minterm);
                    const groupColors = getCellGroupColors(minterm);
                    const highlighted = isHighlighted(minterm);

                    return (
                      <div
                        key={colIndex}
                        className={cn(
                          'w-14 h-14 border border-border flex items-center justify-center font-mono text-lg relative',
                          'transition-all duration-300',
                          value === '0' && 'bg-muted/30 text-muted-foreground',
                          value === '1' && 'text-primary font-semibold',
                          value === 'X' && 'text-muted-foreground italic bg-highlight-dontcare',
                          highlighted && 'ring-2 ring-accent ring-offset-2 ring-offset-background z-10'
                        )}
                      >
                        {/* Group color overlays */}
                        {groupColors.map((color, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'absolute inset-0 rounded-sm opacity-40',
                              `bg-group-${color}`
                            )}
                            style={{
                              background: `hsl(var(--group-${color}) / 0.3)`,
                            }}
                          />
                        ))}
                        
                        <span className="relative z-10">{value}</span>
                        <span className="absolute bottom-0.5 right-1 text-[10px] text-muted-foreground/50 font-mono z-10">
                          {minterm}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Render group outlines */}
              {step.groups.map((group, groupIdx) => (
                <GroupOutline
                  key={groupIdx}
                  group={group}
                  variableCount={variableCount}
                  rows={rows}
                  cols={cols}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Group legend */}
      {step.groups.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {step.groups.map((group, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <div
                className={cn('w-4 h-4 rounded border-2')}
                style={{
                  backgroundColor: `hsl(var(--group-${group.color}) / 0.3)`,
                  borderColor: `hsl(var(--group-${group.color}))`,
                }}
              />
              <span className="font-mono text-muted-foreground">
                {'{' + group.cells.join(', ') + '}'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface GroupOutlineProps {
  group: KMapGroup;
  variableCount: number;
  rows: number;
  cols: number;
}

function GroupOutline({ group, variableCount, rows, cols }: GroupOutlineProps) {
  // Calculate bounding box for the group
  const positions = group.cells.map(cell => {
    const position = getKMapCellPosition(cell, variableCount);
    return {
      row: position.rowIndex,
      col: position.colIndex,
    };
  });

  const minRow = Math.min(...positions.map(p => p.row));
  const maxRow = Math.max(...positions.map(p => p.row));
  const minCol = Math.min(...positions.map(p => p.col));
  const maxCol = Math.max(...positions.map(p => p.col));

  // Handle wrap-around cases
  const wrapsHorizontally = maxCol - minCol > cols / 2;
  const wrapsVertically = maxRow - minRow > rows / 2;

  const cellWidth = 56; // 14 * 4 = 56px (w-14)
  const cellHeight = 56;

  // Simple case: no wrapping
  if (!wrapsHorizontally && !wrapsVertically) {
    return (
      <div
        className="absolute rounded-lg border-3 pointer-events-none animate-scale-in"
        style={{
          left: `${32 + minCol * cellWidth + 2}px`,
          top: `${minRow * cellHeight + 2}px`,
          width: `${(maxCol - minCol + 1) * cellWidth - 4}px`,
          height: `${(maxRow - minRow + 1) * cellHeight - 4}px`,
          borderColor: `hsl(var(--group-${group.color}))`,
          borderWidth: '3px',
        }}
      />
    );
  }

  // For wrapped cases, render multiple outlines
  return null; // Simplified for now
}
