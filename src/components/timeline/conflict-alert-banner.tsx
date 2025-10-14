'use client';

import { Conflict } from '@/types/eventFlow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { ConflictList } from './conflict-list';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConflictAlertBannerProps {
  conflicts: Conflict[];
}

export function ConflictAlertBanner({ conflicts }: ConflictAlertBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  if (!showBanner) return null;

  const highSeverityCount = conflicts.filter((c) => c.severity === 'high').length;
  const mediumSeverityCount = conflicts.filter((c) => c.severity === 'medium').length;
  const lowSeverityCount = conflicts.filter((c) => c.severity === 'low').length;

  return (
    <>
      <Alert variant="destructive" className="relative">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-semibold">
          Timeline Conflicts Detected
        </AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            Found {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} in your
            timeline:
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {highSeverityCount > 0 && (
              <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                {highSeverityCount} High Priority
              </span>
            )}
            {mediumSeverityCount > 0 && (
              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                {mediumSeverityCount} Medium Priority
              </span>
            )}
            {lowSeverityCount > 0 && (
              <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                {lowSeverityCount} Low Priority
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white hover:bg-gray-100"
            onClick={() => setIsOpen(true)}
          >
            View All Conflicts
          </Button>
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => setShowBanner(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timeline Conflicts</DialogTitle>
            <DialogDescription>
              Review and resolve conflicts in your event timeline
            </DialogDescription>
          </DialogHeader>
          <ConflictList conflicts={conflicts} />
        </DialogContent>
      </Dialog>
    </>
  );
}
