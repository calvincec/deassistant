import { KMapGroup } from '@/types/logic';
import { mintermToBinary } from '../normalize/inputNormalizer';

/**
 * K-Map Grouping Logic
 * Finds valid groups (rectangles) in K-map that are powers of 2
 */

// K-map adjacency maps for different variable counts
const ADJACENCY_2VAR: Record<number, number[]> = {
  0: [1, 2],
  1: [0, 3],
  2: [0, 3],
  3: [1, 2],
};

const ADJACENCY_3VAR: Record<number, number[]> = {
  0: [1, 4, 2],
  1: [0, 5, 3],
  2: [3, 6, 0],
  3: [2, 7, 1],
  4: [5, 0, 6],
  5: [4, 1, 7],
  6: [7, 2, 4],
  7: [6, 3, 5],
};

const ADJACENCY_4VAR: Record<number, number[]> = {
  0: [1, 4, 2, 8],
  1: [0, 5, 3, 9],
  2: [3, 6, 0, 10],
  3: [2, 7, 1, 11],
  4: [5, 0, 6, 12],
  5: [4, 1, 7, 13],
  6: [7, 2, 4, 14],
  7: [6, 3, 5, 15],
  8: [9, 12, 10, 0],
  9: [8, 13, 11, 1],
  10: [11, 14, 8, 2],
  11: [10, 15, 9, 3],
  12: [13, 8, 14, 4],
  13: [12, 9, 15, 5],
  14: [15, 10, 12, 6],
  15: [14, 11, 13, 7],
};

function getAdjacencyMap(variableCount: number): Record<number, number[]> {
  switch (variableCount) {
    case 2: return ADJACENCY_2VAR;
    case 3: return ADJACENCY_3VAR;
    case 4: return ADJACENCY_4VAR;
    default: return ADJACENCY_4VAR;
  }
}

export function findAllGroups(cells: number[], variableCount: number): KMapGroup[] {
  const groups: KMapGroup[] = [];
  const maxSize = cells.length;
  
  // Start with individual cells
  cells.forEach(cell => {
    groups.push({
      cells: [cell],
      implicant: {
        minterms: [cell],
        binary: mintermToBinary(cell, variableCount),
        isEssential: false,
        isPrime: false,
      },
      color: 1,
    });
  });

  // Find groups of size 2, 4, 8, 16...
  for (let size = 2; size <= maxSize; size *= 2) {
    const newGroups = findGroupsOfSize(cells, size, variableCount);
    groups.push(...newGroups);
  }

  return groups;
}

function findGroupsOfSize(cells: number[], size: number, variableCount: number): KMapGroup[] {
  const groups: KMapGroup[] = [];
  const cellSet = new Set(cells);
  
  // Generate all combinations of 'size' cells
  const combinations = getCombinations(cells, size);
  
  for (const combo of combinations) {
    if (isValidKMapGroup(combo, variableCount)) {
      const binary = getGroupBinary(combo, variableCount);
      groups.push({
        cells: combo,
        implicant: {
          minterms: combo,
          binary,
          isEssential: false,
          isPrime: false,
        },
        color: 1,
      });
    }
  }

  return groups;
}

function isValidKMapGroup(cells: number[], variableCount: number): boolean {
  // A valid K-map group must:
  // 1. Be a power of 2 in size
  // 2. Form a valid rectangle in K-map space
  
  const size = cells.length;
  if (size === 0 || (size & (size - 1)) !== 0) return false;
  if (size === 1) return true;

  // Check if cells form a valid group using binary representation
  const binaries = cells.map(c => mintermToBinary(c, variableCount));
  
  // Find which bit positions differ
  const differingPositions: number[] = [];
  for (let i = 0; i < variableCount; i++) {
    const bits = binaries.map(b => b[i]);
    if (new Set(bits).size > 1) {
      differingPositions.push(i);
    }
  }

  // For a valid group of size 2^k, exactly k positions should differ
  const expectedDiffering = Math.log2(size);
  if (differingPositions.length !== expectedDiffering) return false;

  // Check that all combinations of differing bits are present
  const fixedBits = binaries[0]
    .split('')
    .map((b, i) => differingPositions.includes(i) ? '-' : b)
    .join('');

  // Generate all expected members
  const expectedCells = new Set<number>();
  for (let mask = 0; mask < size; mask++) {
    let binary = fixedBits.split('');
    let maskBit = 0;
    for (const pos of differingPositions) {
      binary[pos] = ((mask >> maskBit) & 1).toString();
      maskBit++;
    }
    expectedCells.add(parseInt(binary.join(''), 2));
  }

  // All expected cells must be in our group
  return cells.every(c => expectedCells.has(c)) && 
         expectedCells.size === cells.length;
}

function getGroupBinary(cells: number[], variableCount: number): string {
  const binaries = cells.map(c => mintermToBinary(c, variableCount));
  let result = '';
  
  for (let i = 0; i < variableCount; i++) {
    const bits = binaries.map(b => b[i]);
    const uniqueBits = new Set(bits);
    result += uniqueBits.size === 1 ? bits[0] : '-';
  }
  
  return result;
}

function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 1) return arr.map(item => [item]);
  if (size === arr.length) return [arr];
  if (size > arr.length) return [];

  const result: T[][] = [];
  
  function combine(start: number, combo: T[]): void {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  
  combine(0, []);
  return result;
}

export function mergeOverlappingGroups(groups: KMapGroup[], variableCount: number): KMapGroup[] {
  // Filter to keep only the largest non-redundant groups
  const sortedGroups = [...groups].sort((a, b) => b.cells.length - a.cells.length);
  const result: KMapGroup[] = [];
  const coveredCells = new Map<number, KMapGroup[]>();

  for (const group of sortedGroups) {
    // Check if this group is completely covered by existing groups
    const allCovered = group.cells.every(cell => {
      const covering = coveredCells.get(cell) || [];
      return covering.some(g => g.cells.length >= group.cells.length);
    });

    if (!allCovered || result.length === 0) {
      // Check if this group is subsumed by a larger group
      const isSubsumed = result.some(existing => 
        group.cells.every(c => existing.cells.includes(c))
      );

      if (!isSubsumed) {
        result.push(group);
        group.cells.forEach(cell => {
          const existing = coveredCells.get(cell) || [];
          existing.push(group);
          coveredCells.set(cell, existing);
        });
      }
    }
  }

  // Assign colors
  result.forEach((group, index) => {
    group.color = (index % 6) + 1;
  });

  return result;
}
