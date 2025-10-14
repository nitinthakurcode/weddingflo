'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetPrediction } from '@/lib/ai/budget-predictor';

interface PredictionChartProps {
  predictions: BudgetPrediction[];
}

export function PredictionChart({ predictions }: PredictionChartProps) {
  const maxValue = Math.max(
    ...predictions.map((p) => Math.max(p.estimatedTotal, p.predictedFinal))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated vs Predicted</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {predictions.map((pred) => (
            <div key={pred.category} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{pred.category}</span>
                <span className="text-muted-foreground">
                  ${pred.estimatedTotal.toLocaleString()} → ${pred.predictedFinal.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                {/* Estimated bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">Estimated</span>
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(pred.estimatedTotal / maxValue) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                {/* Predicted bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">Predicted</span>
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        pred.variance > 0 ? 'bg-destructive' : 'bg-green-600'
                      }`}
                      style={{
                        width: `${(pred.predictedFinal / maxValue) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
