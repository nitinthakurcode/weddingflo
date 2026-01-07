import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useRouter } from '@/lib/navigation';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  action?: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const router = useRouter();

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
    }
  };

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'border-rose-200 bg-rose-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'info':
        return 'border-primary-200 bg-primary-50';
    }
  };

  const getIconStyles = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'text-rose-600';
      case 'warning':
        return 'text-amber-600';
      case 'info':
        return 'text-primary-600';
    }
  };

  const handleAction = (action?: string) => {
    if (!action) return;

    const actionMap: Record<string, string> = {
      'View Budget': '/dashboard/budget',
      'View Vendors': '/dashboard/vendors',
      'View Guests': '/dashboard/guests',
      'View Timeline': '/dashboard/timeline',
    };

    const href = actionMap[action];
    if (href) {
      router.push(href);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts & Reminders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No alerts at the moment. Everything looks good!
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              const alertStyles = getAlertStyles(alert.type);
              const iconStyles = getIconStyles(alert.type);

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${alertStyles}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 ${iconStyles} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.description}
                      </p>
                      {alert.action && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto mt-2"
                          onClick={() => handleAction(alert.action)}
                        >
                          {alert.action} →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
