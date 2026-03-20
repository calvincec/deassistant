import { create } from 'zustand';
import { 
  AppState, 
  VariableConfig, 
  InputMethod, 
  SolverMethod, 
  OutputFormat,
  CanonicalForm,
  SolverResult 
} from '@/types/logic';

interface AppStore extends AppState {
  // Actions
  setVariableConfig: (config: Partial<VariableConfig>) => void;
  setInputMethod: (method: InputMethod) => void;
  setSolverMethod: (method: SolverMethod) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setCanonicalForm: (form: CanonicalForm | null) => void;
  setResult: (result: SolverResult | null) => void;
  setCurrentStep: (step: number) => void;
  setIsProcessing: (processing: boolean) => void;
  reset: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

const defaultVariableConfig: VariableConfig = {
  count: 4,
  labels: ['A', 'B', 'C', 'D'],
  defaultOutput: 0,
};

const initialState: AppState = {
  variableConfig: defaultVariableConfig,
  inputMethod: 'kmap',
  solverMethod: 'kmap',
  outputFormat: 'SOP',
  canonicalForm: null,
  result: null,
  currentStep: 0,
  isProcessing: false,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  setVariableConfig: (config) => set((state) => ({
    variableConfig: { ...state.variableConfig, ...config },
    canonicalForm: null,
    result: null,
    currentStep: 0,
  })),

  setInputMethod: (method) => set({
    inputMethod: method,
    canonicalForm: null,
    result: null,
    currentStep: 0,
  }),

  setSolverMethod: (method) => set({
    solverMethod: method,
    result: null,
    currentStep: 0,
  }),

  setOutputFormat: (format) => set({
    outputFormat: format,
    result: null,
    currentStep: 0,
  }),

  setCanonicalForm: (form) => set({
    canonicalForm: form,
    result: null,
    currentStep: 0,
  }),

  setResult: (result) => set({
    result,
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
