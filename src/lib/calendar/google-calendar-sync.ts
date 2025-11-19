import { google } from 'googleapis';
import { GoogleCalendarOAuth } from './google-oauth';

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  status?: string;
  reminders?: {
    useDefault: boolean;
  };
}

export class GoogleCalendarSync {
  private oauth: GoogleCalendarOAuth;

  constructor() {
    this.oauth = new GoogleCalendarOAuth();
  }

  /**
   * Create event in Google Calendar
   */
  async createEvent(
    accessToken: string,
    refreshToken: string,
    calendarId: string,
    event: GoogleCalendarEvent
  ) {
    const calendar = this.oauth.getCalendarClient(accessToken, refreshToken);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return response.data;
  }

  /**
   * Update event in Google Calendar
   */
  async updateEvent(
    accessToken: string,
    refreshToken: string,
    calendarId: string,
    eventId: string,
    event: GoogleCalendarEvent
  ) {
    const calendar = this.oauth.getCalendarClient(accessToken, refreshToken);

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: event,
    });

    return response.data;
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEvent(
    accessToken: string,
    refreshToken: string,
    calendarId: string,
    eventId: string
  ) {
    const calendar = this.oauth.getCalendarClient(accessToken, refreshToken);

    await calendar.events.delete({
      calendarId,
      eventId,
    });
  }

  /**
   * List user's calendars
   */
  async listCalendars(accessToken: string, refreshToken: string) {
    const calendar = this.oauth.getCalendarClient(accessToken, refreshToken);

    const response = await calendar.calendarList.list();
    return response.data.items || [];
  }

  /**
   * Get primary calendar ID
   */
  async getPrimaryCalendarId(accessToken: string, refreshToken: string) {
    const calendars = await this.listCalendars(accessToken, refreshToken);
    const primary = calendars.find((cal) => cal.primary);
    return primary?.id || 'primary';
  }
}
