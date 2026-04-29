import React from 'react';
import { Implicant } from '@/types/logic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ResultsPanelProps {
  expression: string;
  implicants: Implicant[];
  essentialImplicants: Implicant[];
  variableLabels: string[];
  outputFormat: 'SOP' | 'POS';
}

export function ResultsPanel({ 
  expression, 
  implicants, 
  essentialImplicants, 
  variableLabels,
  outputFormat 
}: ResultsPanelProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`F = ${expression}`);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Expression copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Final Expression */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Minimized Expression ({outputFormat})</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="expression-display text-xl font-mono">
            F = {expression}
          </div>
        </CardContent>
      </Card>

      {/* Prime Implicants Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Prime Implicants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {implicants.map((imp, idx) => {
              const isEssential = essentialImplicants.some(e => 
                e.binary === imp.binary && 
                e.minterms.every(m => imp.minterms.includes(m))
              );
              
              return (
                <Badge
                  key={idx}
                  variant={isEssential ? 'default' : 'secondary'}
                  className="font-mono text-sm py-1 px-3"
                >
                  {describeTerm(imp.binary, variableLabels)}
                  {isEssential && (
                    <span className="ml-1 text-xs opacity-70">*</span>
                  )}
                </Badge>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * Essential prime implicants (must be included)
          </p>
        </CardContent>
      </Card>

      {/* Coverage Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Coverage Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Prime Implicants:</span>
              <span className="ml-2 font-semibold">{implicants.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Essential Implicants:</span>
              <span className="ml-2 font-semibold">{essentialImplicants.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Terms in Expression:</span>
              <span className="ml-2 font-semibold">
                {expression === '0' || expression === '1' ? 1 : expression.split(outputFormat === 'SOP' ? '+' : '·').length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Literals:</span>
              <span className="ml-2 font-semibold">
                {countLiterals(expression)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function describeTerm(binary: string, labels: string[]): string {
  let term = '';
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      term += labels[i];
    } else if (binary[i] === '0') {
      term += labels[i] + "'";
    }
  }
  return term || '1';
}

function countLiterals(expression: string): number {
  if (expression === '0' || expression === '1') return 0;
  // Count letters (variables) in the expression
  return (expression.match(/[A-Z]/gi) || []).length;
}
