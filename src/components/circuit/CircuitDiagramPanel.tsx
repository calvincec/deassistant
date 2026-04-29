import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Maximize2, X } from 'lucide-react';

export const CircuitDiagramPanel = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  const DiagramContent = () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-muted-foreground/25">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Circuit diagram placeholder
        </p>
        <p className="text-xs text-muted-foreground/60">
          Final simplified and realized circuit
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">Final Realized Circuit</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(true)}
            className="h-8 w-8"
            title="Maximize diagram"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <DiagramContent />
          </div>
        </CardContent>
      </Card>

      {/* Maximize Modal */}
      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pb-2">
            <DialogTitle>Final Realized Circuit - Full View</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="w-full h-full p-4">
              <DiagramContent />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
