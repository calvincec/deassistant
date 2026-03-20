import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: { title: string; description?: string }[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <nav className={cn('flex items-center gap-2', className)} aria-label="Progress">
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;

        return (
          <React.Fragment key={index}>
            <button
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick}
              className={cn(
                'group flex items-center gap-2 transition-all duration-300',
                onStepClick && 'cursor-pointer hover:opacity-80',
                !onStepClick && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'step-dot flex-shrink-0',
                  isComplete && 'bg-step-complete text-primary-foreground',
                  isActive && 'bg-accent text-accent-foreground scale-110',
                  isPending && 'bg-muted text-muted-foreground'
                )}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  'text-sm font-medium hidden md:block transition-colors',
                  isActive && 'text-foreground',
                  !isActive && 'text-muted-foreground'
                )}
              >
                {step.title}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 min-w-8 transition-colors duration-300',
                  index < currentStep ? 'bg-step-complete' : 'bg-border'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
