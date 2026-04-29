import React from 'react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { KMapVisualizer } from '@/components/kmap/KMapVisualizer';
import { QMCVisualizer } from '@/components/qmc/QMCVisualizer';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { KMapStep, QMCStep } from '@/types/logic';
import { CircuitVisualizer } from '@/features/circuit-visualizer';

export function StepByStepViewer() {
  const { 
    result, 
    currentStep, 
    setCurrentStep,
    nextStep,
    prevStep,
    solverMethod,
    outputFormat,
    canonicalForm
  } = useAppStore();

  if (!result || !canonicalForm) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No results yet. Enter your function and click Solve.</p>
      </div>
    );
  }

  const steps = result.steps;
  const currentStepData = steps[currentStep];

  const stepperSteps = steps.map(step => ({
    title: step.title,
  }));

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="space-y-6">
      {/* Step Navigation */}
      <Card>
        <CardContent className="pt-6">
          <Stepper
            steps={stepperSteps}
            currentStep={currentStep}
            onStepClick={(idx) => setCurrentStep(idx)}
          />
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">
                    {currentStepData.title}
                  </h3>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                {currentStepData.title}
              </TooltipContent>
            </Tooltip>
            <span className="text-sm text-muted-foreground font-normal flex-shrink-0 whitespace-nowrap">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {solverMethod === 'kmap' ? (
            <KMapVisualizer
              step={currentStepData as KMapStep}
              canonical={canonicalForm}
            />
          ) : (
            <QMCVisualizer
              step={currentStepData as QMCStep}
              variableLabels={canonicalForm.variableLabels}
            />
          )}

          {/* Step description for K-map */}
          {solverMethod === 'kmap' && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {(currentStepData as KMapStep).description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={isFirstStep}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(0)}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </Button>
          {!isLastStep && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(steps.length - 1)}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              Skip to Result
            </Button>
          )}
        </div>

        <Button
          onClick={nextStep}
          disabled={isLastStep}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Results Panel (always visible) */}
      {isLastStep && (
        <>
          <ResultsPanel
            expression={result.expression}
            implicants={result.implicants}
            essentialImplicants={result.essentialImplicants}
            variableLabels={canonicalForm.variableLabels}
            outputFormat={outputFormat}
          />

          <CircuitVisualizer
            canonical={canonicalForm}
            minimizedExpression={result.expression}
            outputFormat={outputFormat}
          />
        </>
      )}
    </div>
  );
}
