import React from 'react';
import { useAppStore } from '@/store/appStore';
import { ExpressionReductionResult } from '@/types/logic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface TheoremReductionViewerProps {
  reduction: ExpressionReductionResult;
}

export function TheoremReductionViewer({ reduction }: TheoremReductionViewerProps) {
  const { currentStep, setCurrentStep, nextStep, prevStep } = useAppStore();
  const steps = reduction.steps;
  const activeStep = steps[currentStep] ?? steps[steps.length - 1];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card>
        <CardContent className="pt-6">
          <Stepper
            steps={steps.map((step) => ({ title: step.title }))}
            currentStep={currentStep}
            onStepClick={(index) => setCurrentStep(index)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{activeStep.title}</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground flex-shrink-0">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-lg break-words">
            F = {activeStep.expression}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {activeStep.description}
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep(0)} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Restart
          </Button>
          {currentStep < steps.length - 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(steps.length - 1)} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Skip to Result
            </Button>
          )}
        </div>

        <Button onClick={nextStep} disabled={currentStep >= steps.length - 1} className="gap-2">
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {currentStep === steps.length - 1 && (
        <Card className="border-2 border-accent bg-gradient-to-br from-accent/5 to-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Simplified Expression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="expression-display text-xl font-mono">
              F = {reduction.expression}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}