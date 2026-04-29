// Core types for the digital logic system

export type CellValue = 0 | 1 | 'X';

export type OutputFormat = 'SOP' | 'POS';

export type SolverMethod = 'kmap' | 'qmc';

export type InputMethod = 'kmap' | 'truthTable' | 'expression' | 'minterms' | 'maxterms';

export interface VariableConfig {
  count: number; // 2-6
  labels: string[];
  defaultOutput: 0 | 1;
}

export interface TruthTableRow {
  inputs: number[];
  output: CellValue;
  minterm: number;
}

export interface CanonicalForm {
  minterms: number[];
  maxterms: number[];
  dontCares: number[];
  variableCount: number;
  variableLabels: string[];
}

export interface Implicant {
  minterms: number[];
  binary: string;
  isEssential: boolean;
  isPrime: boolean;
}

export interface KMapGroup {
  cells: number[];
  implicant: Implicant;
  color: number; // 1-6 for group colors
}

export interface KMapStep {
  title: string;
  description: string;
  groups: KMapGroup[];
  highlightedCells: number[];
}

export interface QMCStep {
  title: string;
  description: string;
  data: QMCStepData;
}

export type QMCStepData = 
  | { type: 'grouping'; groups: Record<number, { binary: string; minterms: number[] }[]> }
  | { type: 'combination'; pairs: { a: string; b: string; result: string; combined: number[] }[] }
  | { type: 'primeImplicants'; implicants: Implicant[] }
  | { type: 'chart'; chart: boolean[][]; minterms: number[]; implicants: Implicant[] }
  | { type: 'essential'; essential: Implicant[]; remaining: number[] }
  | { type: 'final'; expression: string };

export interface SolverResult {
  expression: string;
  implicants: Implicant[];
  essentialImplicants: Implicant[];
  steps: KMapStep[] | QMCStep[];
}

export interface AppState {
  variableConfig: VariableConfig;
  inputMethod: InputMethod;
  solverMethod: SolverMethod;
  outputFormat: OutputFormat;
  canonicalForm: CanonicalForm | null;
  result: SolverResult | null;
  currentStep: number;
  isProcessing: boolean;
}
