'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useRouter } from '@/lib/navigation';

export default function ReportsPage() {
  const router = useRouter();

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          Business reports and data exports
        </p>
      </div>

      {/* Redirect to Analytics */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Reports coming soon</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Advanced reporting is under development. In the meantime, visit Analytics for charts and insights.
          </p>
          <Button onClick={() => router.push('/dashboard/analytics')}>
            Go to Analytics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
