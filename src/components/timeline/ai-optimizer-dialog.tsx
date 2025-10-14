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
import type { TimelineOptimizationResult } from '@/lib/ai/timeline-optimizer';

interface AIOptimizerDialogProps {
  events: any[];
  onOptimizationComplete: (result: TimelineOptimizationResult) => void;
}

export function AIOptimizerDialog({
  events,
  onOptimizationComplete,
}: AIOptimizerDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOptimize = async () => {
    if (events.length === 0) {
      toast({
        title: 'No events',
        description: 'Add timeline events before optimizing.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/timeline-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to optimize timeline');
      }

      const result = await response.json();
      onOptimizationComplete(result);
      setOpen(false);
      toast({
        title: 'Timeline optimized!',
        description: `Found ${result.conflicts.length} conflicts and ${result.suggestions.length} optimization opportunities.`,
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
          Optimize Timeline
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Timeline Optimizer</DialogTitle>
          <DialogDescription>
            Let AI analyze your timeline to detect conflicts, suggest better timing, and
            optimize your event schedule.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Events</p>
              <p className="text-muted-foreground">{events.length} scheduled</p>
            </div>
            <div>
              <p className="font-medium">Analysis</p>
              <p className="text-muted-foreground">Conflicts & optimization</p>
            </div>
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium mb-1">AI will check for:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Time overlaps and scheduling conflicts</li>
              <li>Vendor availability issues</li>
              <li>Insufficient travel or buffer time</li>
              <li>Better timing and sequencing</li>
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
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Optimize Timeline
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
