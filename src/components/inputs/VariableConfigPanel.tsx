import React from 'react';
import { useAppStore } from '@/store/appStore';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings2 } from 'lucide-react';

export function VariableConfigPanel() {
  const { variableConfig, setVariableConfig } = useAppStore();

  const getDefaultLabel = (index: number) => {
    if (index < 26) {
      return String.fromCharCode(65 + index);
    }
    return `V${index + 1}`;
  };

  const handleCountChange = (value: string) => {
    const count = parseInt(value);
    const nextLabels = Array.from({ length: count }, (_, index) => {
      const existing = variableConfig.labels[index]?.trim();
      return existing || getDefaultLabel(index);
    });

    setVariableConfig({
      count,
      labels: nextLabels,
    });
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
    newLabels[index] = getDefaultLabel(index);
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
          <Select value={variableConfig.count.toString()} onValueChange={handleCountChange}>
            <SelectTrigger id="varCount" className="w-full">
              <SelectValue placeholder="Select variable count" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Variables</SelectItem>
              <SelectItem value="3">3 Variables</SelectItem>
              <SelectItem value="4">4 Variables</SelectItem>
            </SelectContent>
          </Select>
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
                className="w-24 text-center font-mono"
                maxLength={8}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            You may Customize the variable names (e.g., A, B, C, D or w, x, y, z)
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
