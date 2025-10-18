'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CreativeJob,
  CreativeStatus,
  CREATIVE_STATUS_LABELS,
  CREATIVE_TYPES,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from '@/types/creative';
import { Calendar, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/budget-calculations';

interface CreativeKanbanProps {
  jobs: CreativeJob[];
  isLoading?: boolean;
  onEdit: (job: CreativeJob) => void;
  onDelete: (job: CreativeJob) => void;
  onStatusChange: (jobId: string, newStatus: CreativeStatus) => void;
  activeFilter?: string | null;
}

const KANBAN_COLUMNS: CreativeStatus[] = [
  'pending',
  'in_progress',
  'review',
  'approved',
  'completed',
];

export function CreativeKanban({
  jobs,
  isLoading,
  onEdit,
  onDelete,
  onStatusChange,
  activeFilter,
}: CreativeKanbanProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => (
          <div key={status} className="flex-1 min-w-[300px]">
            <Card>
              <CardHeader className="pb-3">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 bg-muted animate-pulse rounded"
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
          No creative projects yet. Click &quot;Add Project&quot; to get started.
        </CardContent>
      </Card>
    );
  }

  // Determine which columns to show based on active filter
  let visibleColumns = KANBAN_COLUMNS;
  if (activeFilter && activeFilter !== 'all') {
    switch (activeFilter) {
      case 'review':
        visibleColumns = ['review'];
        break;
      case 'completed':
        visibleColumns = ['completed'];
        break;
      case 'overdue':
        // Show all columns for overdue filter
        visibleColumns = KANBAN_COLUMNS;
        break;
      default:
        visibleColumns = KANBAN_COLUMNS;
    }
  }

  const jobsByStatus = visibleColumns.reduce(
    (acc, status) => {
      acc[status] = jobs.filter((job) => job.status === status);
      return acc;
    },
    {} as Record<CreativeStatus, CreativeJob[]>
  );

  const handleDragStart = (e: React.DragEvent, job: CreativeJob) => {
    e.dataTransfer.setData('jobId', job.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: CreativeStatus) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    const job = jobs.find((j) => j.id === jobId);
    if (job && job.status !== newStatus) {
      onStatusChange(jobId, newStatus);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {visibleColumns.map((status) => {
        const columnJobs = jobsByStatus[status] || [];
        return (
          <div key={status} className="flex-1 min-w-[300px]">
            <Card
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
              className="h-full"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{CREATIVE_STATUS_LABELS[status]}</span>
                  <Badge variant="secondary">{columnJobs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnJobs.map((job) => (
                  <Card
                    key={job.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, job)}
                    className="cursor-move hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{job.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {CREATIVE_TYPES[job.type]}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(job)}
                            className="h-6 w-6 p-0"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(job)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {job.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {job.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <Badge className={PRIORITY_COLORS[job.priority]} variant="secondary">
                          {PRIORITY_LABELS[job.priority]}
                        </Badge>
                        {job.files.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {job.files.length}
                          </Badge>
                        )}
                      </div>

                      {job.progress > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-1" />
                        </div>
                      )}

                      {job.budget && (
                        <div className="text-xs text-muted-foreground">
                          Budget: {formatCurrency(job.budget)}
                        </div>
                      )}

                      {job.due_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(job.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
