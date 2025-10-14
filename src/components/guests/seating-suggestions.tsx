'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import type { SeatingOptimizationResult } from '@/lib/ai/seating-optimizer';

interface SeatingSuggestionsProps {
  result: SeatingOptimizationResult;
}

export function SeatingSuggestions({ result }: SeatingSuggestionsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Seating Analysis</CardTitle>
              <CardDescription>Overall compatibility and recommendations</CardDescription>
            </div>
            <Badge
              variant={result.overallScore >= 80 ? 'default' : 'secondary'}
              className="text-lg px-4 py-2"
            >
              {result.overallScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>AI Reasoning</AlertTitle>
            <AlertDescription>{result.reasoning}</AlertDescription>
          </Alert>

          {result.warnings && result.warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Table Scores:</h4>
            <div className="space-y-2">
              {result.assignments.map((assignment) => (
                <div
                  key={assignment.tableId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{assignment.tableName}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${assignment.compatibilityScore}%` }}
                      />
                    </div>
                    <span className="font-medium w-12 text-right">
                      {assignment.compatibilityScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
