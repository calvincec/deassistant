import React from 'react';
import { useAppStore } from '@/store/appStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2 } from 'lucide-react';
import { generateVariableLabels } from '@/logic/normalize/inputNormalizer';

export function VariableConfigPanel() {
  const { variableConfig, solverMethod, setVariableConfig } = useAppStore();
  const isKMapSolver = solverMethod === 'kmap';
  const [countInput, setCountInput] = React.useState(variableConfig.count.toString());

  React.useEffect(() => {
    setCountInput(variableConfig.count.toString());
  }, [variableConfig.count]);

  const applyCount = (value: string, options?: { min?: number; max?: number; fallback?: number }) => {
    if (!value.trim()) return;

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;

    const min = options?.min ?? 1;
    const max = options?.max;
    const fallback = options?.fallback;
    let count = Math.max(min, parsed);

    if (max !== undefined) {
      count = Math.min(count, max);
    }

    if (!Number.isFinite(count) && fallback !== undefined) {
      count = fallback;
    }

    setVariableConfig({
      count,
      labels: generateVariableLabels(count, variableConfig.labels),
    });
  };

  const handleCountInputChange = (value: string) => {
    // Accept only digits; reject e, +, -, decimal points, and whitespace.
    if (!/^\d*$/.test(value)) return;

    setCountInput(value);
  };

  const handleCountBlur = () => {
    if (!countInput.trim()) {
      setCountInput('4');
      applyCount('4', { min: 1, fallback: 4 });
      return;
    }

    const parsed = Number.parseInt(countInput, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setCountInput('4');
      applyCount('4', { min: 1, fallback: 4 });
      return;
    }

    applyCount(countInput, { min: 1 });
  };

  const handleQMCKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    const allowedKeys = new Set([
      'Backspace',
      'Delete',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Enter',
    ]);

    if (allowedKeys.has(e.key)) {
      if (e.key === 'Enter') {
        handleCountBlur();
      }
      return;
    }

    if (/^\d$/.test(e.key)) {
      return;
    }

    e.preventDefault();

    if (!countInput.trim()) {
      setCountInput('4');
      applyCount('4', { min: 1, fallback: 4 });
    }
  };

  const handleQMCStepApply = (value: string) => {
    if (!value.trim()) {
      setCountInput('4');
      applyCount('4', { min: 1, fallback: 4 });
      return;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setCountInput('4');
      applyCount('4', { min: 1, fallback: 4 });
      return;
    }

    applyCount(value, { min: 1 });
  };

  const handleQMCWheel: React.WheelEventHandler<HTMLInputElement> = (e) => {
    if (!countInput.trim()) {
      e.preventDefault();
      setCountInput('4');
      applyCount('4', { min: 1, fallback: 4 });
    }
  };

  const handleLabelChange = (index: number, value: string) => {
    const newLabels = [...variableConfig.labels];
    const sanitized = value.replace(/\s+/g, '').slice(0, 8);
    newLabels[index] = sanitized;
    setVariableConfig({ labels: newLabels });
  };

  const handleLabelBlur = (index: number) => {
    const current = variableConfig.labels[index]?.trim();
    if (current) return;

    const newLabels = [...variableConfig.labels];
    newLabels[index] = generateVariableLabels(index + 1)[index];
    setVariableConfig({ labels: newLabels });
  };

  const handleDefaultOutputChange = (value: string) => {
    setVariableConfig({ defaultOutput: parseInt(value) as 0 | 1 });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Variable Configuration</h3>
          <p className="text-sm text-muted-foreground">Set up your Boolean function parameters</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Number of Variables */}
        <div className="space-y-2">
          <Label htmlFor="varCount" className="text-sm font-medium">
            Number of Variables
          </Label>
          {isKMapSolver ? (
            <Select
              value={Math.min(Math.max(variableConfig.count, 1), 6).toString()}
              onValueChange={(value) => {
                applyCount(value, { min: 1, max: 6, fallback: 4 });
                setCountInput(value);
              }}
            >
              <SelectTrigger id="varCount" className="w-full">
                <SelectValue placeholder="Select variable count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="varCount"
              type="number"
              min={1}
              step={1}
              value={countInput}
              onChange={(e) => {
                handleCountInputChange(e.target.value);
                if (e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'insertReplacementText') {
                  handleQMCStepApply(e.target.value);
                }
              }}
              onBlur={handleCountBlur}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={handleQMCKeyDown}
              onWheel={handleQMCWheel}
            />
          )}
          <p className="text-xs text-muted-foreground">
            {isKMapSolver
              ? 'K-map solver allows selecting 1 to 6 variables.'
              : 'QMC accepts positive integers only. Empty or invalid input defaults to 4.'}
          </p>
        </div>

        {/* Variable Labels */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variable Labels</Label>
          <div className="flex gap-2 flex-wrap">
            {variableConfig.labels.map((label, index) => (
              <Input
                key={index}
                value={label}
                onChange={(e) => handleLabelChange(index, e.target.value)}
                onBlur={() => handleLabelBlur(index)}
                onFocus={(e) => e.currentTarget.select()}
                className="w-24 text-center font-mono"
                maxLength={16}
                placeholder={generateVariableLabels(index + 1)[index]}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Labels default to A, B, C, D, ... Z, AA, AB, AC and continue as needed.
          </p>
        </div>

        {/* Default Output */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Default Output Value</Label>
          <RadioGroup
            value={variableConfig.defaultOutput.toString()}
            onValueChange={handleDefaultOutputChange}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="0" id="default-0" />
              <Label htmlFor="default-0" className="font-mono cursor-pointer">
                All 0s
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="default-1" />
              <Label htmlFor="default-1" className="font-mono cursor-pointer">
                All 1s
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}
