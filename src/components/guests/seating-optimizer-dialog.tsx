'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SeatingOptimizationResult } from '@/lib/ai/seating-optimizer';

interface SeatingOptimizerDialogProps {
  guests: any[];
  tables: any[];
  onOptimizationComplete: (result: SeatingOptimizationResult) => void;
}

export function SeatingOptimizerDialog({
  guests,
  tables,
  onOptimizationComplete,
}: SeatingOptimizerDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOptimize = async () => {
    if (guests.length === 0) {
      toast({
        title: 'No guests',
        description: 'Add guests before optimizing seating.',
        variant: 'destructive',
      });
      return;
    }

    if (tables.length === 0) {
      toast({
        title: 'No tables',
        description: 'Add tables before optimizing seating.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests, tables }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to optimize seating');
      }

      const result = await response.json();
      onOptimizationComplete(result);
      setOpen(false);
      toast({
        title: 'Seating optimized!',
        description: `Generated seating arrangement with ${result.overallScore}% compatibility.`,
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: 'Optimization failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Seating Optimizer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Seating Optimizer</DialogTitle>
          <DialogDescription>
            Let AI analyze your guest list and create optimal table assignments based on
            relationships, preferences, and conflicts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Guests</p>
              <p className="text-muted-foreground">{guests.length} total</p>
            </div>
            <div>
              <p className="font-medium">Tables</p>
              <p className="text-muted-foreground">{tables.length} total</p>
            </div>
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium mb-1">AI will consider:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Guest relationships and preferences</li>
              <li>Conflicts and seating restrictions</li>
              <li>Table capacity limits</li>
              <li>Dietary restrictions for catering</li>
            </ul>
          </div>
          <Button
            onClick={handleOptimize}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Optimize Seating
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
