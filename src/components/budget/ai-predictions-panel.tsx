'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BudgetPredictionResult } from '@/lib/ai/budget-predictor';

interface AIPredictionsPanelProps {
  budgetItems: any[];
  eventDetails: any;
}

export function AIPredictionsPanel({ budgetItems, eventDetails }: AIPredictionsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<BudgetPredictionResult | null>(null);
  const { toast } = useToast();

  const handlePredict = async () => {
    if (budgetItems.length === 0) {
      toast({
        title: 'No budget items',
        description: 'Add budget items before generating predictions.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/budget-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetItems, eventDetails }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate predictions');
      }

      const result = await response.json();
      setPredictions(result);
      toast({
        title: 'Predictions generated!',
        description: `AI analyzed your budget with ${result.overallConfidence}% confidence.`,
      });
    } catch (error) {
      console.error('Prediction error:', error);
      toast({
        title: 'Prediction failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Budget Predictions</CardTitle>
              <CardDescription>
                Get AI-powered predictions for your final costs
              </CardDescription>
            </div>
            <Button onClick={handlePredict} disabled={loading} variant="outline">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Predict Costs
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {predictions && (
          <CardContent className="space-y-6">
            {/* Overall Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Total</p>
                <p className="text-2xl font-bold">${predictions.totalEstimated.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Predicted Final</p>
                <p className="text-2xl font-bold text-primary">
                  ${predictions.totalPredicted.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Variance</p>
                <p className={`text-2xl font-bold ${predictions.totalVariance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {predictions.totalVariance > 0 ? '+' : ''}${predictions.totalVariance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Category Predictions */}
            <div className="space-y-3">
              <h4 className="font-medium">Category Predictions</h4>
              {predictions.predictions.map((pred) => (
                <div key={pred.category} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">{pred.category}</h5>
                    <Badge variant={pred.variance > 0 ? 'destructive' : 'default'}>
                      {pred.confidenceScore}% confidence
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Estimated</p>
                      <p className="font-medium">${pred.estimatedTotal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Predicted</p>
                      <p className="font-medium">${pred.predictedFinal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Variance</p>
                      <p className={`font-medium flex items-center gap-1 ${pred.variance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {pred.variance > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : pred.variance < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : null}
                        {pred.variance > 0 ? '+' : ''}${pred.variance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">{pred.reasoning}</p>
                </div>
              ))}
            </div>

            {/* Risk Factors */}
            {predictions.riskFactors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Risk Factors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {predictions.riskFactors.map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            {predictions.recommendations.length > 0 && (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Recommendations</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {predictions.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
