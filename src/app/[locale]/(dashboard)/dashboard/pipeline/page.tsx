'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function PipelinePage() {
  const t = useTranslations('pipeline');

  const { data: kanbanData, isLoading: kanbanLoading } = trpc.pipeline.leads.getByStages.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.pipeline.leads.getStats.useQuery();

  const isLoading = kanbanLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.activeDeals')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.winRate')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.pipelineValue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(stats.totalEstimatedBudget || 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.weightedValue')}</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus?.won || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      {kanbanData && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanData.stages.map((stage) => {
            const stageLeads = kanbanData.leadsByStage[stage.id] || [];
            return (
              <div key={stage.id} className="flex-shrink-0 w-72">
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: stage.color || '#6B7280' }}
                  />
                  <h3 className="font-semibold text-sm">{stage.name}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {stageLeads.length}
                  </Badge>
                </div>
                <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {t('noClients')}
                    </p>
                  ) : (
                    stageLeads.map((lead) => (
                      <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="font-medium text-sm">
                            {lead.firstName} {lead.lastName}
                            {lead.partnerFirstName && (
                              <span className="text-muted-foreground"> & {lead.partnerFirstName}</span>
                            )}
                          </div>
                          {lead.email && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{lead.email}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {lead.priority && lead.priority !== 'medium' && (
                              <Badge
                                variant={lead.priority === 'urgent' || lead.priority === 'high' ? 'destructive' : 'secondary'}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {lead.priority}
                              </Badge>
                            )}
                            {lead.estimatedBudget && (
                              <span className="text-xs text-muted-foreground">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(lead.estimatedBudget))}
                              </span>
                            )}
                          </div>
                          {lead.weddingDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {lead.weddingDate}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
