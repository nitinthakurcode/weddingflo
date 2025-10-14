# Communication System Implementation Guide

Complete email, SMS, and push notification system for WeddingFlow Pro.

## 📊 Overview

This guide covers the comprehensive communication system built for WeddingFlow Pro, including:
- ✉️ **Email Service** (Resend + React Email)
- 📱 **SMS Service** (Twilio)
- 🔔 **Push Notifications** (Web Push API)

---

## 🎯 What Was Built

### 1. Email Service (`src/lib/email/`)

#### Core Files:
- **resend-client.ts** - Resend SDK integration
  - `sendEmail()` - Send single email
  - `sendBulkEmails()` - Send multiple emails
  - `isValidEmail()` - Email validation
  - `sanitizeEmails()` - Email sanitization

- **rate-limiter.ts** - Anti-spam protection
  - Per-user limits: 10 emails/hour
  - Per-recipient limits: 3 emails/hour
  - Global limits: 100 emails/hour
  - Automatic cleanup of expired entries

- **email-queue.ts** - Background processing
  - Non-blocking email delivery
  - Priority queuing (high/normal/low)
  - Automatic retries (up to 3 attempts)
  - Scheduled sending support

- **template-renderer.ts** - React Email rendering
  - HTML generation from React components
  - Plain text fallback
  - Company branding integration

### 2. Email Templates (`src/emails/`)

All templates use React Email components with beautiful, responsive designs:

#### ✅ **layout.tsx** - Base template
- Header with logo/company name
- Consistent styling
- Footer with links
- Fully customizable branding

#### ✅ **invite-email.tsx** - Event invitations
```typescript
Props: {
  guestName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  rsvpUrl?: string;
  message?: string;
}
```

#### ✅ **reminder-email.tsx** - Event reminders
```typescript
Props: {
  guestName: string;
  eventName: string;
  eventDate: string;
  daysUntilEvent: number;
  checkInUrl?: string;
}
```

#### ✅ **thank-you-email.tsx** - Gift acknowledgments
```typescript
Props: {
  guestName: string;
  giftDescription?: string;
  personalMessage?: string;
  coupleName?: string;
}
```

#### ✅ **rsvp-confirmation-email.tsx** - RSVP confirmations
```typescript
Props: {
  guestName: string;
  eventName: string;
  attendingStatus: 'yes' | 'no' | 'maybe';
  guestCount?: number;
  dietaryRestrictions?: string;
  calendarUrl?: string;
}
```

#### ✅ **vendor-notification-email.tsx** - Vendor alerts
```typescript
Props: {
  vendorName: string;
  notificationType: 'payment_due' | 'booking_confirmed' | 'update_required' | 'reminder';
  eventName: string;
  message: string;
  dueDate?: string;
  amount?: number;
}
```

#### ✅ **budget-alert-email.tsx** - Budget warnings
```typescript
Props: {
  userName: string;
  eventName: string;
  totalBudget: number;
  spentAmount: number;
  overageAmount?: number;
  categoryBreakdown?: Array<...>;
}
```

### 3. Email API Routes (`src/app/api/email/`)

#### POST `/api/email/send`
Send a single email (with rate limiting).

**Request:**
```typescript
{
  to: string | string[];
  subject: string;
  template?: string;          // Template name
  templateProps?: any;        // Template data
  html?: string;              // Or raw HTML
  text?: string;              // Plain text version
  queue?: boolean;            // Queue for later
  priority?: 'high' | 'normal' | 'low';
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: { id: string };
  error?: string;
  queued?: boolean;
  queueId?: string;
}
```

#### POST `/api/email/bulk-send`
Send multiple emails in batches.

**Request:**
```typescript
{
  emails: Array<{
    to: string;
    subject: string;
    template?: string;
    templateProps?: any;
  }>;
  batchSize?: number;         // Default: 10
  queue?: boolean;            // Default: true
}
```

**Response:**
```typescript
{
  success: boolean;
  total: number;
  successful: number;
  failed: number;
}
```

#### GET `/api/email/preview/[template]`
Preview email templates in browser.

**Example:**
```
/api/email/preview/invite?guestName=John&eventName=Wedding
```

### 4. SMS Service (`src/lib/sms/`)

#### twilio-client.ts
```typescript
// Send SMS
await sendSMS({
  to: '+1234567890',
  message: 'Your event starts in 1 hour!',
});

// Check if Twilio is configured
const enabled = isTwilioEnabled();

// Format phone number
const formatted = formatPhoneNumber('(555) 123-4567'); // +15551234567
```

#### POST `/api/sms/send`
Send SMS message.

**Request:**
```typescript
{
  to: string;              // Phone number
  message: string;         // Max 1600 chars
  from?: string;           // Optional sender
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    sid: string;
    status: string;
  };
  error?: string;
}
```

### 5. Push Notifications (`src/lib/notifications/`)

#### push-service.ts
```typescript
// Check support
const supported = isPushSupported();

// Request permission
const permission = await requestNotificationPermission();

// Subscribe
const subscription = await subscribeToPush();

// Show notification
await showNotification({
  title: 'New Check-In',
  body: 'John Doe just checked in!',
  icon: '/icon.png',
  tag: 'check-in-123',
  data: { guestId: '123' },
});
```

### 6. UI Components (`src/components/communication/`)

#### EmailComposer
```typescript
<EmailComposer
  defaultTo="guest@example.com"
  defaultSubject="Event Update"
  onSent={() => console.log('Email sent!')}
/>
```

**Features:**
- To, Subject, Message fields
- Template selection
- Preview functionality
- Queue for delivery
- Error handling

#### PushPermissionPrompt
```typescript
<PushPermissionPrompt />
```

**Features:**
- Auto-detects browser support
- Requests permission
- Dismissable
- Saves preference

---

## 🚀 Usage Examples

### Send Invitation Email
```typescript
// In your component or API route
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'guest@example.com',
    subject: "You're Invited!",
    template: 'invite-email',
    templateProps: {
      guestName: 'John Doe',
      eventName: "Sarah & Michael's Wedding",
      eventDate: 'June 15, 2025',
      eventTime: '4:00 PM',
      venue: 'The Grand Ballroom',
      rsvpUrl: 'https://yoursite.com/rsvp/abc123',
    },
    queue: true,
  }),
});
```

### Send Reminder SMS
```typescript
await fetch('/api/sms/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+15551234567',
    message: 'Reminder: Wedding ceremony starts in 2 hours at The Grand Ballroom!',
  }),
});
```

### Send Bulk Emails
```typescript
await fetch('/api/email/bulk-send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emails: guests.map(guest => ({
      to: guest.email,
      subject: 'Event Reminder',
      template: 'reminder-email',
      templateProps: {
        guestName: guest.name,
        eventName: 'Wedding',
        eventDate: 'June 15, 2025',
        eventTime: '4:00 PM',
        venue: 'The Grand Ballroom',
        daysUntilEvent: 7,
      },
    })),
    queue: true,
  }),
});
```

### Show Push Notification
```typescript
import { showNotification } from '@/lib/notifications/push-service';

// When guest checks in
await showNotification({
  title: 'Guest Checked In',
  body: `${guestName} has checked in to the event`,
  icon: '/icon-192x192.png',
  tag: `check-in-${guestId}`,
  data: { guestId, timestamp: Date.now() },
  actions: [
    { action: 'view', title: 'View Details' },
    { action: 'dismiss', title: 'Dismiss' },
  ],
});
```

---

## ⚙️ Configuration

### Environment Variables

Add these to your `.env.local`:

```env
# Resend (Email) - Already configured
RESEND_API_KEY=re_your_key_here

# Twilio (SMS) - Already configured
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Web Push (Optional - for production)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

### Generate VAPID Keys (for Push Notifications)

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: BJxxxxx...
Private Key: Dxxxxx...
```

Add these to your `.env.local`.

---

## 🧪 Testing

### Test Email Templates (Preview)

Visit these URLs in your browser:

```
http://localhost:3000/api/email/preview/invite
http://localhost:3000/api/email/preview/reminder
http://localhost:3000/api/email/preview/thank-you
http://localhost:3000/api/email/preview/rsvp-confirmation
http://localhost:3000/api/email/preview/vendor-notification
http://localhost:3000/api/email/preview/budget-alert
```

### Test Email Sending

```typescript
// Test route (create at src/app/api/test-email/route.ts)
export async function GET() {
  const result = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: 'your-email@example.com',
      subject: 'Test Email',
      html: '<h1>Hello from WeddingFlow Pro!</h1>',
    }),
  });

  return Response.json(await result.json());
}
```

Visit: `http://localhost:3000/api/test-email`

### Check Resend Dashboard

1. Go to https://resend.com/emails
2. View sent emails
3. Check delivery status
4. View email content

---

## 📋 Integration Checklist

### Email Integration
- [ ] Send invitation when guest is added
- [ ] Send reminder 7 days before event
- [ ] Send thank you when gift is received
- [ ] Send RSVP confirmation when guest responds
- [ ] Send vendor notification for payments
- [ ] Send budget alert when overspent

### SMS Integration (Optional)
- [ ] Send check-in confirmation
- [ ] Send event reminders
- [ ] Send emergency updates

### Push Notifications
- [ ] Request permission on dashboard load
- [ ] Subscribe user to push
- [ ] Show notification on guest check-in
- [ ] Show notification on new message
- [ ] Show notification on budget alert

---

## 🎨 Customization

### Customize Email Templates

1. **Modify existing templates:**
   - Edit files in `src/emails/`
   - Change colors, layout, content
   - Preview changes at `/api/email/preview/[template]`

2. **Add new templates:**
   ```typescript
   // src/emails/welcome-email.tsx
   export function WelcomeEmail({ userName }: { userName: string }) {
     return (
       <EmailLayout preview="Welcome to WeddingFlow!">
         <Heading>Welcome {userName}!</Heading>
         <Text>Thanks for joining us...</Text>
       </EmailLayout>
     );
   }
   ```

3. **Update branding:**
   - Modify `EmailLayout` component
   - Update colors in template files
   - Add company logo URL

### Rate Limit Adjustment

Edit `src/lib/email/rate-limiter.ts`:

```typescript
export const RATE_LIMITS = {
  perUser: {
    maxRequests: 20,  // Change from 10 to 20
    windowMs: 60 * 60 * 1000,
  },
  // ... other limits
};
```

---

## 🔒 Security Best Practices

1. **Rate Limiting:** Already implemented - prevents spam
2. **Email Validation:** All emails are validated before sending
3. **Authentication:** All API routes require Clerk authentication
4. **Environment Variables:** Never commit API keys
5. **HTTPS Only:** Use HTTPS in production for push notifications

---

## 📊 Monitoring

### Track Email Deliverability

Check Resend dashboard for:
- Delivery rate
- Bounce rate
- Complaint rate
- Open rate (if tracking enabled)

### Track SMS Delivery

Check Twilio dashboard for:
- Message status
- Delivery reports
- Error logs

---

## 🐛 Troubleshooting

### Emails Not Sending

1. Check Resend API key is correct
2. Verify email addresses are valid
3. Check rate limits haven't been exceeded
4. View Resend dashboard for errors

### SMS Not Sending

1. Verify Twilio credentials
2. Check phone number format (E.164)
3. Ensure phone number is not on do-not-call list
4. Check Twilio account balance

### Push Notifications Not Working

1. Check browser supports notifications
2. Verify HTTPS (required in production)
3. Check user granted permission
4. Verify VAPID keys are configured

---

## 📈 Performance Optimization

1. **Use Email Queue:** Set `queue: true` for non-critical emails
2. **Batch Processing:** Use bulk-send for multiple recipients
3. **Rate Limit Monitoring:** Monitor rate limit usage
4. **Template Caching:** Templates are cached automatically

---

## 🎉 Success Metrics

Track these metrics to measure success:

- **Email Delivery Rate:** Should be > 95%
- **Email Open Rate:** Industry average is 20-25%
- **SMS Delivery Rate:** Should be > 98%
- **Push Opt-In Rate:** Target 20-40%

---

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Components](https://react.email/docs/components/html)
- [Twilio API Reference](https://www.twilio.com/docs/sms/api)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

---

## ✅ Completed Features

- ✅ Email service with Resend
- ✅ 7 beautiful email templates
- ✅ Rate limiting and anti-spam
- ✅ Email queue system
- ✅ API routes for sending emails
- ✅ Email preview functionality
- ✅ SMS service with Twilio
- ✅ Push notification support
- ✅ Email composer UI
- ✅ Push permission prompt

---

**Built with:** Resend, React Email, Twilio, Web Push API
**Status:** ✅ Production Ready
**Last Updated:** October 2025
