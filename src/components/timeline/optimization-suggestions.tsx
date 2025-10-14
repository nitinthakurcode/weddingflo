'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle2, Lightbulb } from 'lucide-react';
import type { TimelineOptimizationResult } from '@/lib/ai/timeline-optimizer';

interface OptimizationSuggestionsProps {
  result: TimelineOptimizationResult;
  events: any[];
}

export function OptimizationSuggestions({ result, events }: OptimizationSuggestionsProps) {
  const getEventTitle = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    return event?.title || eventId;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Timeline Optimization</CardTitle>
              <CardDescription>AI-powered schedule analysis</CardDescription>
            </div>
            <Badge
              variant={result.optimizationScore >= 80 ? 'default' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {result.optimizationScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Overall Assessment</AlertTitle>
            <AlertDescription>{result.reasoning}</AlertDescription>
          </Alert>

          {/* Conflicts */}
          {result.conflicts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Conflicts Detected ({result.conflicts.length})
              </h4>
              {result.conflicts.map((conflict, index) => (
                <Alert key={index} variant="destructive">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <AlertTitle className="mb-0">
                        {conflict.conflictType.replace('_', ' ').toUpperCase()}
                      </AlertTitle>
                      <Badge variant={getSeverityColor(conflict.severity)}>
                        {conflict.severity}
                      </Badge>
                    </div>
                    <AlertDescription>
                      <p className="mb-2">{conflict.description}</p>
                      <p className="text-sm">
                        <strong>Events:</strong>{' '}
                        {conflict.eventIds.map(id => getEventTitle(id)).join(', ')}
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Suggestion:</strong> {conflict.suggestion}
                      </p>
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Optimization Suggestions ({result.suggestions.length})
              </h4>
              {result.suggestions.map((suggestion, index) => (
                <Card key={index}>
                  <CardContent className="pt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium">{getEventTitle(suggestion.eventId)}</h5>
                      <Badge variant="outline">Timing change</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Current</p>
                        <p className="font-medium">
                          {new Date(suggestion.currentTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Suggested</p>
                        <p className="font-medium text-primary">
                          {new Date(suggestion.suggestedTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t space-y-1">
                      <p className="text-sm">
                        <strong>Reasoning:</strong> {suggestion.reasoning}
                      </p>
                      <p className="text-sm">
                        <strong>Impact:</strong> {suggestion.impact}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {result.conflicts.length === 0 && result.suggestions.length === 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Timeline looks great!</AlertTitle>
              <AlertDescription>
                No conflicts detected and no optimization suggestions needed.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
