import { createHash, randomBytes } from 'crypto';

export interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  created: Date;
  lastModified: Date;
  sequence: number;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

export class ICalGenerator {
  /**
   * Generate secure token for iCal feed URL
   */
  static generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Format date to iCalendar format (YYYYMMDDTHHMMSSZ in UTC)
   */
  static formatDate(date: Date): string {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  }

  /**
   * Escape special characters in iCal text fields
   */
  static escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Generate iCalendar feed from events
   */
  static generate(events: ICalEvent[], calendarName: string): string {
    const lines: string[] = [];

    // Calendar header
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//WeddingFlo//Calendar Feed//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push(`X-WR-CALNAME:${this.escapeText(calendarName)}`);
    lines.push('X-WR-TIMEZONE:UTC');

    // Add each event
    for (const event of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.uid}`);
      lines.push(`DTSTAMP:${this.formatDate(new Date())}`);
      lines.push(`DTSTART:${this.formatDate(event.startDate)}`);
      lines.push(`DTEND:${this.formatDate(event.endDate)}`);
      lines.push(`SUMMARY:${this.escapeText(event.summary)}`);

      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
      }

      if (event.location) {
        lines.push(`LOCATION:${this.escapeText(event.location)}`);
      }

      lines.push(`CREATED:${this.formatDate(event.created)}`);
      lines.push(`LAST-MODIFIED:${this.formatDate(event.lastModified)}`);
      lines.push(`SEQUENCE:${event.sequence}`);
      lines.push(`STATUS:${event.status}`);
      lines.push('END:VEVENT');
    }

    // Calendar footer
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }
}
