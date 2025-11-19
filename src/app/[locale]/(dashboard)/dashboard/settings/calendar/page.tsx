import { ICalFeedManager } from '@/components/calendar/ical-feed-manager';
import { GoogleCalendarConnect } from '@/components/calendar/google-calendar-connect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CalendarSettingsPage() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Calendar Settings</h1>
        <p className="text-muted-foreground">
          Manage your calendar feed and synchronization settings
        </p>
      </div>

      <Tabs defaultValue="ical" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ical">iCal Feed</TabsTrigger>
          <TabsTrigger value="google">Google Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="ical" className="space-y-6">
          <ICalFeedManager />
        </TabsContent>

        <TabsContent value="google" className="space-y-6">
          <GoogleCalendarConnect />
        </TabsContent>
      </Tabs>
    </div>
  );
}
