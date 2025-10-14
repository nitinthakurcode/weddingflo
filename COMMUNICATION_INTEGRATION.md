# Communication Features - Integration Guide

The communication system is now fully integrated into WeddingFlow Pro! Here's where you can find and use these features.

## Where to Find Communication Features

### 1. Guest Details Sheet (Primary Location)

**Location**: Dashboard > Guests > Click any guest in the list

**Features Available**:
- **Send Message** button appears when a guest has email or phone number
- Opens a dialog with three tabs:
  - **Email Tab**: Send emails with templates (invite, reminder, thank you, etc.)
  - **SMS Tab**: Send text messages (up to 1600 characters)
  - **WhatsApp Tab**: Opens WhatsApp Web with pre-filled message

**How to Use**:
1. Go to `/dashboard/guests`
2. Click on any guest row to open the details sheet
3. Click the "Send Message" button (appears above "Edit Guest")
4. Choose your communication method (Email/SMS/WhatsApp)
5. Compose and send your message

### 2. Email Composer Component

**Direct Usage**: Can be embedded in any page

```typescript
import { EmailComposer } from '@/components/communication';

<EmailComposer
  defaultTo="guest@example.com"
  defaultSubject="Event Update"
  onSent={() => console.log('Email sent!')}
/>
```

### 3. Push Notification Prompt

**Where to Add**: Dashboard layout or any page

```typescript
import { PushPermissionPrompt } from '@/components/communication';

<PushPermissionPrompt />
```

## Communication Features Overview

### Email System

**API Endpoint**: `/api/email/send`

**Features**:
- 7 beautiful email templates (React Email)
- Rate limiting (10/hour per user, 3/hour per recipient)
- Background queue for reliable delivery
- Template preview in browser
- Bulk sending support

**Templates Available**:
1. **invite-email** - Event invitations
2. **reminder-email** - Event reminders with countdown
3. **thank-you-email** - Thank you notes
4. **rsvp-confirmation-email** - RSVP confirmations
5. **vendor-notification-email** - Vendor alerts
6. **budget-alert-email** - Budget warnings

**Preview Templates**:
Open in browser:
- http://localhost:3000/api/email/preview/invite
- http://localhost:3000/api/email/preview/reminder
- http://localhost:3000/api/email/preview/thank-you
- http://localhost:3000/api/email/preview/rsvp-confirmation
- http://localhost:3000/api/email/preview/vendor-notification
- http://localhost:3000/api/email/preview/budget-alert

### SMS System

**API Endpoint**: `/api/sms/send`

**Features**:
- Twilio integration
- Phone number validation (E.164 format)
- 1600 character limit
- Rate limiting applied

**Phone Format**: `+15551234567` (country code + number)

### WhatsApp Integration

**How it Works**:
- Opens WhatsApp Web in new tab
- Pre-fills message for you
- User sends from their WhatsApp
- No API needed (uses `wa.me` links)

## Quick Examples

### Send Email to Guest

```typescript
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'guest@example.com',
    subject: 'Event Reminder',
    template: 'reminder-email',
    templateProps: {
      guestName: 'John Doe',
      eventName: 'Wedding Ceremony',
      eventDate: 'June 15, 2025',
      eventTime: '4:00 PM',
      venue: 'The Grand Ballroom',
      daysUntilEvent: 7,
    },
    queue: true, // Send in background
  }),
});
```

### Send SMS

```typescript
const response = await fetch('/api/sms/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+15551234567',
    message: 'Your event starts in 1 hour! See you soon!',
  }),
});
```

### Send Bulk Emails

```typescript
const response = await fetch('/api/email/bulk-send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emails: guests.map(guest => ({
      to: guest.email,
      subject: 'Event Reminder',
      template: 'reminder-email',
      templateProps: {
        guestName: guest.name,
        eventName: 'Wedding Ceremony',
        eventDate: 'June 15, 2025',
        eventTime: '4:00 PM',
        venue: 'The Grand Ballroom',
        daysUntilEvent: 7,
      },
    })),
    queue: true, // Always queue bulk sends
  }),
});
```

## UI Components Integrated

### SendCommunicationDialog

**Location**: `src/components/communication/send-communication-dialog.tsx`

**Integrated In**:
- Guest Details Sheet (`src/components/guests/guest-details-sheet.tsx`)

**Props**:
```typescript
interface SendCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
}
```

**Features**:
- Tabbed interface (Email/SMS/WhatsApp)
- Auto-disables tabs if contact info missing
- Template selection for emails
- Character count for SMS
- Toast notifications for success/error
- Loading states

### EmailComposer

**Location**: `src/components/communication/email-composer.tsx`

**Features**:
- Full email composition form
- Template selection dropdown
- Preview emails before sending
- Queue support
- Success callbacks

### PushPermissionPrompt

**Location**: `src/components/communication/push-permission-prompt.tsx`

**Features**:
- Beautiful card UI
- Auto-detects browser support
- Dismissable with persistence
- Permission state management

## Rate Limits

**Email**:
- Per user: 10 emails/hour
- Per recipient: 3 emails/hour
- Global: 100 emails/hour

**SMS**:
- Same limits as email
- Additional 1600 character limit per message

**Rate limits reset automatically after the time window.**

## File Structure

```
src/
├── components/communication/
│   ├── email-composer.tsx         # Email composition UI
│   ├── push-permission-prompt.tsx # Push notification prompt
│   ├── send-communication-dialog.tsx # Email/SMS/WhatsApp dialog
│   └── index.ts                   # Export all components
├── lib/
│   ├── email/
│   │   ├── resend-client.ts      # Resend integration
│   │   ├── rate-limiter.ts       # Rate limiting
│   │   ├── email-queue.ts        # Background queue
│   │   └── template-renderer.ts  # React Email rendering
│   ├── sms/
│   │   └── twilio-client.ts      # Twilio integration
│   └── notifications/
│       └── push-service.ts       # Web Push API
├── emails/
│   ├── layout.tsx                # Base template
│   ├── invite-email.tsx          # Event invitation
│   ├── reminder-email.tsx        # Event reminder
│   ├── thank-you-email.tsx       # Thank you note
│   ├── rsvp-confirmation-email.tsx # RSVP confirmation
│   ├── vendor-notification-email.tsx # Vendor notification
│   ├── budget-alert-email.tsx    # Budget alert
│   └── index.tsx                 # Export all templates
└── app/api/
    ├── email/
    │   ├── send/route.ts         # Send single email
    │   ├── bulk-send/route.ts    # Send bulk emails
    │   └── preview/[template]/route.ts # Preview templates
    └── sms/
        └── send/route.ts         # Send SMS
```

## Environment Variables Required

```bash
# Email (Resend)
RESEND_API_KEY=re_xxx          # Already configured ✓

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx      # Already configured ✓
TWILIO_AUTH_TOKEN=xxx          # Already configured ✓
TWILIO_PHONE_NUMBER=+1xxx      # Already configured ✓

# Web Push (Optional - for push notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx  # Generate using web-push
VAPID_PRIVATE_KEY=xxx             # Generate using web-push
```

## Testing the Integration

### 1. Test Guest Communication

1. Run the app: `npm run dev`
2. Go to http://localhost:3000/dashboard/guests
3. Click on any guest with email or phone
4. Click "Send Message" button
5. Try sending an email with template
6. Try sending an SMS
7. Try opening WhatsApp

### 2. Test Email Templates

Visit in browser:
- http://localhost:3000/api/email/preview/invite
- http://localhost:3000/api/email/preview/reminder

### 3. Test Email Sending

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>Hello World!</p>",
    "queue": true
  }'
```

## Future Enhancements

**Planned Features**:
1. Bulk messaging from guest list (select multiple guests)
2. Email history and tracking
3. Scheduled sending (send at specific time)
4. Email templates customization UI
5. SMS templates
6. Push notification integration
7. Communication analytics dashboard
8. Auto-send triggers (on check-in, RSVP, etc.)
9. Vendor communication integration
10. Message templates library

## Troubleshooting

### Emails Not Sending

1. Check Resend dashboard: https://resend.com/emails
2. Verify `RESEND_API_KEY` in `.env.local`
3. Check rate limits in console
4. Look for errors in terminal

### SMS Not Working

1. Check Twilio console: https://console.twilio.com
2. Verify credentials in `.env.local`
3. Ensure phone format: `+15551234567`
4. Check account balance

### WhatsApp Not Opening

1. Ensure phone number is valid
2. Check browser allows popups
3. Try opening manually: `https://wa.me/15551234567`

### "Send Message" Button Not Showing

1. Guest must have email OR phone number
2. Check guest data in database
3. Verify guest details sheet is receiving guest data

## Documentation

**Comprehensive Guides**:
- `COMMUNICATION_SYSTEM_GUIDE.md` - Full system documentation
- `COMMUNICATION_QUICK_START.md` - Quick start examples
- `COMMUNICATION_INTEGRATION.md` - This file

**Forms & Validation**:
- `FORMS_REFACTOR_GUIDE.md` - Form components guide
- `FORMS_QUICK_REFERENCE.md` - Form quick reference

---

**Questions or Issues?**

Check the comprehensive guides or test in the Resend/Twilio dashboards.
