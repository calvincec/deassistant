import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { VariableConfigPanel } from '@/components/inputs/VariableConfigPanel';
import { InputMethodSelector } from '@/components/inputs/InputMethodSelector';
import { SolverSelector } from '@/components/inputs/SolverSelector';
import { KMapInput } from '@/components/kmap/KMapInput';
import { TruthTableInput } from '@/components/truthTable/TruthTableInput';
import { MintermInput, MaxtermInput } from '@/components/inputs/MintermMaxtermInput';
import { ExpressionInput } from '@/components/expressionEditor/ExpressionInput';
import { StepByStepViewer } from '@/components/results/StepByStepViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Play, RotateCcw, Cpu, BookOpen, ArrowLeft } from 'lucide-react';
import { solveKMap } from '@/logic/kmap/kmapSolver';
import { solveQMC } from '@/logic/qmc/qmcSolver';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generateVariableLabels } from '@/logic/normalize/inputNormalizer';

const Index = () => {
  const { 
    variableConfig, 
    inputMethod, 
    solverMethod, 
    outputFormat,
    canonicalForm,
    expressionReduction,
    result,
    setVariableConfig,
    setSolverMethod,
    setOutputFormat,
    setCanonicalForm,
    setExpressionReduction,
    setResult,
    setCurrentStep,
  } = useAppStore();
  
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [inputResetKey, setInputResetKey] = useState(0);
  const [isSolutionViewOpen, setIsSolutionViewOpen] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      // Ignore tiny scroll changes to avoid jitter on touchpads.
      if (Math.abs(delta) < 8) return;

      if (currentScrollY <= 20) {
        setIsHeaderVisible(true);
      } else {
        setIsHeaderVisible(delta < 0);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSolve = () => {
    setIsProcessing(true);
    
    try {
      if (expressionReduction) {
        setIsSolutionViewOpen(true);
        toast({
          title: 'Reduction Complete',
          description: 'Expression simplified using boolean theorems and laws',
        });
        return;
      }

      if (!canonicalForm) {
        toast({
          title: 'Missing Input',
          description: 'Please provide a valid function input before solving.',
          variant: 'destructive',
        });
        return;
      }
      
      const solverResult = solverMethod === 'kmap'
        ? solveKMap(canonicalForm, outputFormat)
        : solveQMC(canonicalForm, outputFormat);
      
      setResult(solverResult);
      setIsSolutionViewOpen(true);
      
      toast({
        title: 'Simplification Complete',
        description: `Expression minimized using ${solverMethod === 'kmap' ? 'K-Map' : 'Quine-McCluskey'} method`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to simplify expression. Please check your input.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetFunctionInput = () => {
    setCanonicalForm(null);
    setExpressionReduction(null);
    setResult(null);
    setCurrentStep(0);
    setInputResetKey((prev) => prev + 1);
    setIsSolutionViewOpen(false);
    toast({ title: 'Function Input Reset', description: 'Function input has been cleared' });
  };

  const handleResetConfigAndSolver = () => {
    setVariableConfig({
      count: 4,
      labels: generateVariableLabels(4),
      defaultOutput: 0,
    });
    setSolverMethod('kmap');
    setOutputFormat('SOP');

    // Config and solver changes invalidate prior canonical/solution states.
    setCanonicalForm(null);
    setExpressionReduction(null);
    setResult(null);
    setCurrentStep(0);
    setIsSolutionViewOpen(false);

    toast({
      title: 'Configuration Reset',
      description: 'Variable configuration and solver options restored to defaults',
    });
  };

  const renderInputComponent = () => {
    switch (inputMethod) {
      case 'kmap': return <KMapInput />;
      case 'truthTable': return <TruthTableInput />;
      case 'minterms': return <MintermInput />;
      case 'maxterms': return <MaxtermInput />;
      case 'expression': return <ExpressionInput />;
      default: return <MintermInput />;
    }
  };

  const handleBackToInputView = () => {
    setIsSolutionViewOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className={`border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 transition-transform duration-300 ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <Cpu className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Digital Electronics Assistant</h1>
                <p className="text-sm text-muted-foreground">Boolean Function Minimization Tool</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden md:inline">Tutorial</span>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isSolutionViewOpen && result ? (
          <div className="max-w-5xl mx-auto space-y-6">
            <Button
              variant="outline"
              onClick={handleBackToInputView}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Input
            </Button>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step-by-Step Solution</CardTitle>
              </CardHeader>
              <CardContent>
                <StepByStepViewer />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column: Configuration */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Solver Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <SolverSelector />
                </CardContent>
              </Card>

              <VariableConfigPanel />

            </div>

            {/* Middle Column: Input */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Function Input</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <InputMethodSelector />
                  <Separator />
                  <div key={`${inputMethod}-${inputResetKey}`}>
                    {renderInputComponent()}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Button
                  onClick={handleSolve}
                  disabled={isProcessing}
                  className="h-12 text-lg gap-2 sm:col-span-3"
                >
                  <Play className="w-5 h-5" />
                  {isProcessing ? 'Processing...' : 'Solve'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetFunctionInput}
                  className="h-12 gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Function Input
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetConfigAndSolver}
                  className="h-12 gap-2 sm:col-span-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset solver & variable config
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Supports K-Map and Quine-McCluskey algorithms with step-by-step explanations</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
