import { create } from 'zustand';
import { 
  AppState, 
  VariableConfig, 
  InputMethod, 
  SolverMethod, 
  OutputFormat,
  CanonicalForm,
  SolverResult,
  ExpressionReductionResult
} from '@/types/logic';
import { generateVariableLabels } from '@/logic/normalize/inputNormalizer';

interface AppStore extends AppState {
  // Actions
  setVariableConfig: (config: Partial<VariableConfig>) => void;
  setInputMethod: (method: InputMethod) => void;
  setSolverMethod: (method: SolverMethod) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setCanonicalForm: (form: CanonicalForm | null) => void;
  setExpressionReduction: (reduction: ExpressionReductionResult | null) => void;
  setResult: (result: SolverResult | null) => void;
  setCurrentStep: (step: number) => void;
  setIsProcessing: (processing: boolean) => void;
  reset: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const defaultVariableConfig: VariableConfig = {
  count: 4,
  labels: generateVariableLabels(4),
  defaultOutput: 0,
};

const initialState: AppState = {
  variableConfig: defaultVariableConfig,
  inputMethod: 'kmap',
  solverMethod: 'kmap',
  outputFormat: 'SOP',
  canonicalForm: null,
  expressionReduction: null,
  result: null,
  currentStep: 0,
  isProcessing: false,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  setVariableConfig: (config) => set((state) => {
    const requestedCount = config.count ?? state.variableConfig.count;
    const shouldClampForKMap = state.solverMethod === 'kmap';
    const count = shouldClampForKMap ? Math.min(requestedCount, 6) : requestedCount;
    const hasExplicitLabels = Object.prototype.hasOwnProperty.call(config, 'labels');
    const labelsSource = config.labels ?? state.variableConfig.labels;
    const labels = hasExplicitLabels
      ? labelsSource
      : generateVariableLabels(count, labelsSource);

    return {
      variableConfig: {
        ...state.variableConfig,
        ...config,
        count,
        labels,
      },
      canonicalForm: null,
      expressionReduction: null,
      result: null,
      currentStep: 0,
    };
  }),

  setInputMethod: (method) => set((state) => {
    const nextMethod = state.solverMethod === 'qmc' && method === 'kmap'
      ? 'minterms'
      : method;

    return {
      inputMethod: nextMethod,
      variableConfig: nextMethod === 'kmap' && state.variableConfig.count > 6
        ? {
            ...state.variableConfig,
            count: 6,
            labels: generateVariableLabels(6, state.variableConfig.labels),
          }
        : state.variableConfig,
      canonicalForm: null,
      expressionReduction: null,
      result: null,
      currentStep: 0,
    };
  }),

  setSolverMethod: (method) => set((state) => ({
    solverMethod: method,
    inputMethod: method === 'qmc' && state.inputMethod === 'kmap'
      ? 'minterms'
      : state.inputMethod,
    variableConfig: method === 'kmap' && state.variableConfig.count > 6
      ? {
          ...state.variableConfig,
          count: 6,
          labels: generateVariableLabels(6, state.variableConfig.labels),
        }
      : state.variableConfig,
    result: null,
    expressionReduction: null,
    currentStep: 0,
  })),

  setOutputFormat: (format) => set({
    outputFormat: format,
    result: null,
    expressionReduction: null,
    currentStep: 0,
  }),

  setCanonicalForm: (form) => set({
    canonicalForm: form,
    expressionReduction: null,
    result: null,
    currentStep: 0,
  }),

  setExpressionReduction: (reduction) => set({
    expressionReduction: reduction,
    canonicalForm: null,
    result: null,
    currentStep: 0,
  }),

  setResult: (result) => set({
    result,
    expressionReduction: null,
    currentStep: 0,
  }),

  setCurrentStep: (step) => set({ currentStep: step }),

  setIsProcessing: (processing) => set({ isProcessing: processing }),

  reset: () => set(initialState),

  nextStep: () => {
    const { result, currentStep } = get();
    if (result && currentStep < result.steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },
}));
