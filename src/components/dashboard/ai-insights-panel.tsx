import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface AIInsight {
  type: 'success' | 'warning' | 'info';
  message: string;
  recommendation?: string;
}

interface AIInsightsPanelProps {
  insights?: AIInsight[];
  completionPercentage?: number;
  timelineStatus?: string;
  budgetHealth?: string;
}

export function AIInsightsPanel({
  insights = [],
  completionPercentage = 0,
  timelineStatus = 'on_track',
  budgetHealth = 'good',
}: AIInsightsPanelProps) {
  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return TrendingUp;
    }
  };

  const getInsightStyles = (type: AIInsight['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
    }
  };

  // Generate default insights if none provided
  const defaultInsights: AIInsight[] = [
    {
      type: completionPercentage > 75 ? 'success' : 'info',
      message: `You're ${completionPercentage.toFixed(0)}% complete with your wedding planning`,
      recommendation:
        completionPercentage < 75
          ? 'Focus on confirming vendors and finalizing guest list'
          : 'Great progress! Final touches remaining',
    },
    {
      type: budgetHealth === 'good' ? 'success' : 'warning',
      message:
        budgetHealth === 'good'
          ? 'Budget is healthy and on track'
          : 'Budget needs attention - spending approaching limit',
      recommendation:
        budgetHealth !== 'good'
          ? 'Review spending in high-cost categories'
          : undefined,
    },
    {
      type: timelineStatus === 'on_track' ? 'success' : 'warning',
      message:
        timelineStatus === 'on_track'
          ? 'Timeline is progressing smoothly'
          : 'Some timeline tasks need attention',
      recommendation:
        timelineStatus !== 'on_track'
          ? 'Check for overdue activities and vendor confirmations'
          : undefined,
    },
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>AI Insights</CardTitle>
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          Refresh Insights
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Completion Progress */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Planning Progress</h4>
              <span className="text-2xl font-bold text-purple-600">
                {completionPercentage.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* AI Insights */}
          <div className="space-y-3">
            {displayInsights.map((insight, index) => {
              const Icon = getInsightIcon(insight.type);
              const styles = getInsightStyles(insight.type);

              return (
                <div key={index} className={`p-3 rounded-lg ${styles}`}>
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{insight.message}</p>
                      {insight.recommendation && (
                        <p className="text-xs mt-1 opacity-75">
                          💡 {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Badges */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Timeline</p>
              <p
                className={`text-sm font-semibold capitalize ${
                  timelineStatus === 'on_track' ? 'text-green-600' : 'text-yellow-600'
                }`}
              >
                {timelineStatus.replace('_', ' ')}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Budget</p>
              <p
                className={`text-sm font-semibold capitalize ${
                  budgetHealth === 'good' ? 'text-green-600' : 'text-yellow-600'
                }`}
              >
                {budgetHealth}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
