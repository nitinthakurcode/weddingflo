'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreativeStatsCards } from '@/components/creatives/creative-stats-cards';
import { CreativeKanban } from '@/components/creatives/creative-kanban';
import { CreativeJobDialog } from '@/components/creatives/creative-job-dialog';
import { CreativeJob } from '@/types/creative';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/loading-spinner';

export default function CreativesPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Get current user and their clients
  const { data: currentUser } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients', currentUser?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', currentUser?.company_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.company_id,
  });

  // Get weddings for the first client
  const selectedClient = clients?.[0];
  const { data: weddings } = useQuery({
    queryKey: ['weddings', selectedClient?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('client_id', selectedClient?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClient?.id,
  });

  // Use first wedding for now (in production, add wedding selector)
  const selectedWedding = weddings && weddings.length > 0 ? weddings[0] : null;
  const weddingId = selectedWedding?.id;

  // Fetch creative jobs and stats
  const { data: creativeJobs, isLoading: creativeJobsLoading } = useQuery({
    queryKey: ['creative-jobs', weddingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creative_jobs')
        .select('*')
        .eq('wedding_id', weddingId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId,
  });

  const { data: creativeStats } = useQuery({
    queryKey: ['creative-stats', weddingId],
    queryFn: async () => {
      if (!creativeJobs) return null;

      const now = Date.now();
      const total = creativeJobs.length;
      const inReview = creativeJobs.filter((job: any) => job.status === 'review').length;
      const completed = creativeJobs.filter((job: any) => job.status === 'completed').length;
      const overdue = creativeJobs.filter((job: any) => {
        if (!job.due_date) return false;
        const dueDate = new Date(job.due_date).getTime();
        return dueDate < now && job.status !== 'completed' && job.status !== 'cancelled';
      }).length;

      return { total, inReview, completed, overdue };
    },
    enabled: !!creativeJobs,
  });

  const deleteCreativeJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('creative_jobs')
        .delete()
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative-jobs', weddingId] });
    },
  });

  const updateCreativeJobMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: CreativeJob['status'] }) => {
      const { error } = await supabase
        .from('creative_jobs')
        .update({ status })
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative-jobs', weddingId] });
    },
  });

  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CreativeJob | undefined>();
  const [creativeFilter, setCreativeFilter] = useState<string | null>(null);

  const handleFilterChange = (filter: string | null) => {
    setCreativeFilter(filter);
  };

  const handleAddJob = () => {
    setEditingJob(undefined);
    setJobDialogOpen(true);
  };

  const handleEditJob = (job: CreativeJob) => {
    setEditingJob(job);
    setJobDialogOpen(true);
  };

  const handleDeleteJob = async (job: CreativeJob) => {
    if (!window.confirm(`Are you sure you want to delete ${job.title}?`)) {
      return;
    }

    try {
      await deleteCreativeJobMutation.mutateAsync(job.id);
      toast({
        title: 'Success',
        description: 'Creative job deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete creative job',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: CreativeJob['status']) => {
    try {
      await updateCreativeJobMutation.mutateAsync({ jobId, status: newStatus });
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  // Filter creative jobs for overdue case (cross-column filter)
  // For other filters, the Kanban component handles column visibility
  const filteredCreativeJobs = (() => {
    if (!creativeJobs) return [];
    if (!creativeFilter || creativeFilter === 'all' || creativeFilter === 'review' || creativeFilter === 'completed') {
      return creativeJobs;
    }

    const now = Date.now();

    switch (creativeFilter) {
      case 'overdue':
        return creativeJobs.filter((job: any) => {
          if (!job.due_date) return false;
          const dueDate = new Date(job.due_date).getTime();
          return dueDate < now && job.status !== 'completed' && job.status !== 'cancelled';
        });
      default:
        return creativeJobs;
    }
  })();

  // Loading state
  if (!user || currentUser === undefined) {
    return <PageLoader />;
  }

  // Not authenticated
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in to manage creative projects.
          </p>
        </div>
      </div>
    );
  }

  // Loading data
  if (
    clients === undefined ||
    weddings === undefined ||
    (creativeJobsLoading && creativeJobs === undefined) ||
    creativeStats === undefined
  ) {
    return <PageLoader />;
  }

  // No client found state
  if (!selectedClient) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Client Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a client first to manage creative projects.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Client creation is not yet available in this demo.
          </p>
        </div>
      </div>
    );
  }

  // No wedding found state
  if (!selectedWedding || !weddingId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Wedding Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a wedding first to manage creative projects.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Wedding creation is not yet available in this demo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Hero section with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-200 via-primary-100 to-secondary-200 p-6 sm:p-8 border-2 border-primary-300 shadow-lg -mx-4 md:-mx-8 mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Creative Projects</h2>
            <p className="text-sm sm:text-base text-gray-700 mt-1">
              Manage wedding invitations, designs, and creative assets
            </p>
          </div>
          <Button
            onClick={handleAddJob}
            className="bg-white hover:bg-gray-50 text-gray-900 shadow-xl hover:shadow-2xl transition-all duration-200 border-2 border-white/50"
          >
            <Plus className="mr-2 h-4 w-4 font-bold" />
            <span className="font-bold">Add Project</span>
          </Button>
        </div>
      </div>

      <CreativeStatsCards
        stats={creativeStats || { total: 0, inReview: 0, completed: 0, overdue: 0 }}
        isLoading={false}
        onFilterChange={handleFilterChange}
      />

      {creativeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {filteredCreativeJobs.length} of {creativeJobs?.length || 0} projects
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCreativeFilter(null)}
            className="h-7 px-2 text-xs"
          >
            Clear filter
          </Button>
        </div>
      )}

      <CreativeKanban
        jobs={filteredCreativeJobs}
        isLoading={false}
        onEdit={handleEditJob}
        onDelete={handleDeleteJob}
        onStatusChange={handleStatusChange}
        activeFilter={creativeFilter}
      />

      <CreativeJobDialog
        open={jobDialogOpen}
        onOpenChange={setJobDialogOpen}
        job={editingJob}
        weddingId={weddingId}
      />
    </div>
  );
}
