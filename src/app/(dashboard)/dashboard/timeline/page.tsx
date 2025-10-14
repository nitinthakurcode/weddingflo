'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { TimelineView } from '@/components/timeline/timeline-view';
import { ActivityDialog } from '@/components/timeline/activity-dialog';
import { DependencyGraph } from '@/components/timeline/dependency-graph';
import { EventActivity } from '@/types/eventFlow';
import { ActivityFormValues } from '@/lib/validations/eventFlow.schema';
import { Plus, GitBranch } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { Id } from '@/convex/_generated/dataModel';

export default function TimelinePage() {
  const { toast } = useToast();

  // Get current user and their clients
  const currentUser = useQuery(api.users.getCurrent);
  const clients = useQuery(
    api.clients.list,
    currentUser?.company_id ? { companyId: currentUser.company_id } : 'skip'
  );

  // Use first client for now
  const selectedClient = clients?.[0];
  const clientId = selectedClient?._id;

  // Fetch activities
  const activities = useQuery(api.eventFlow.list, clientId ? { clientId } : 'skip');

  const createActivity = useMutation(api.eventFlow.create);
  const updateActivity = useMutation(api.eventFlow.update);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<EventActivity | undefined>();

  const handleCreateActivity = async (data: ActivityFormValues) => {
    if (!currentUser?.company_id || !clientId) {
      toast({
        title: 'Error',
        description: 'Missing required information',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Calculate end_time from start_time and duration_minutes
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + data.duration_minutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      await createActivity({
        company_id: currentUser.company_id,
        client_id: clientId,
        date: Date.now(),
        activity: data.activity_name,
        activity_type: data.activity_type,
        activity_description: data.description,
        start_time: data.start_time,
        duration_minutes: data.duration_minutes,
        end_time: end_time,
        buffer_minutes: data.time_buffer_minutes,
        event: 'Wedding', // Default
        location: data.location || '',
        manager: data.assigned_to?.[0] || 'Unassigned',
        order: (activities?.length || 0),
        notes: data.notes,
      });

      toast({
        title: 'Success',
        description: 'Activity created successfully',
      });
      closeDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create activity',
        variant: 'destructive',
      });
    }
  };

  const handleEditActivity = async (data: ActivityFormValues) => {
    if (!selectedActivity) return;

    try {
      // Calculate end_time from start_time and duration_minutes
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + data.duration_minutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      await updateActivity({
        eventFlowId: selectedActivity._id,
        activity: data.activity_name,
        start_time: data.start_time,
        duration_minutes: data.duration_minutes,
        end_time: end_time,
        location: data.location,
        manager: data.assigned_to?.[0] || 'Unassigned',
        notes: data.notes,
      });

      toast({
        title: 'Success',
        description: 'Activity updated successfully',
      });
      closeDialog();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update activity',
        variant: 'destructive',
      });
    }
  };

  const handleActivityClick = (activity: EventActivity) => {
    setSelectedActivity(activity);
    setIsDialogOpen(true);
  };

  const handleActivityReorder = (reorderedActivities: EventActivity[]) => {
    console.log('Reordering activities:', reorderedActivities);
    // TODO: Implement batch update with Convex
    // await updateActivityOrder({ activities: reorderedActivities });
  };

  const openDialog = (activity?: EventActivity) => {
    setSelectedActivity(activity);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setSelectedActivity(undefined);
    setIsDialogOpen(false);
  };

  // Loading state
  if (currentUser === undefined) {
    return <PageLoader />;
  }

  // Not authenticated
  if (currentUser === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground mt-2">
            Please sign in to manage timeline.
          </p>
        </div>
      </div>
    );
  }

  // Loading clients and activities
  if (clients === undefined || activities === undefined) {
    return <PageLoader />;
  }

  // No client found state
  if (!selectedClient || !clientId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Client Found</h2>
          <p className="text-muted-foreground mt-2">
            Please create a client first to manage timeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-friendly header */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">Event Timeline</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words">
            Manage your event activities and schedule
          </p>
        </div>
        <div className="sm:ml-4">
          <Button onClick={() => openDialog()} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Add Activity</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="timeline" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto sm:w-auto sm:inline-flex">
          <TabsTrigger value="timeline" className="text-xs sm:text-sm py-2">Timeline</TabsTrigger>
          <TabsTrigger value="dependencies" className="text-xs sm:text-sm py-2 flex items-center justify-center gap-1 sm:gap-2">
            <GitBranch className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Dependencies</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-6">
          {activities.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Activities Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by adding your first activity to the timeline
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-5 w-5" />
                  Add First Activity
                </Button>
              </div>
            </div>
          ) : (
            <TimelineView
              activities={activities}
              onActivityClick={handleActivityClick}
              onActivityReorder={handleActivityReorder}
            />
          )}
        </TabsContent>

        <TabsContent value="dependencies">
          <DependencyGraph activities={activities} />
        </TabsContent>
      </Tabs>

      {/* Activity Dialog */}
      <ActivityDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        activity={selectedActivity}
        onSubmit={selectedActivity ? handleEditActivity : handleCreateActivity}
      />
    </div>
  );
}
