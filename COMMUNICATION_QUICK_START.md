# Communication System - Quick Start

Get started with sending emails, SMS, and push notifications in 5 minutes.

## 🚀 Quick Start Guide

### 1. Send Your First Email

```typescript
// In any React component or API route
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'guest@example.com',
    subject: 'Welcome to WeddingFlow!',
    html: '<h1>Hello!</h1><p>Welcome to our wedding planning app.</p>',
    queue: true, // Send in background
  }),
});

const result = await response.json();
console.log(result); // { success: true, queued: true, queueId: '...' }
```

### 2. Send Email with Template

```typescript
await fetch('/api/email/send', {
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
      rsvpUrl: 'https://example.com/rsvp',
    },
  }),
});
```

### 3. Preview Templates

Open in your browser:
```
http://localhost:3000/api/email/preview/invite
http://localhost:3000/api/email/preview/reminder
http://localhost:3000/api/email/preview/thank-you
```

### 4. Send SMS (if Twilio configured)

```typescript
await fetch('/api/sms/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+15551234567',
    message: 'Your event starts in 1 hour!',
  }),
});
```

### 5. Add Email Composer to Your Page

```typescript
import { EmailComposer } from '@/components/communication/email-composer';

export default function GuestDetailsPage() {
  return (
    <div>
      <h1>Send Email to Guest</h1>
      <EmailComposer
        defaultTo="guest@example.com"
        defaultSubject="Event Update"
        onSent={() => alert('Email sent!')}
      />
    </div>
  );
}
```

### 6. Request Push Notifications

```typescript
import { PushPermissionPrompt } from '@/components/communication/push-permission-prompt';

export default function DashboardLayout() {
  return (
    <div>
      <PushPermissionPrompt />
      {/* Your dashboard content */}
    </div>
  );
}
```

## 📧 Available Email Templates

1. **invite-email** - Event invitations
2. **reminder-email** - Event reminders
3. **thank-you-email** - Thank you notes
4. **rsvp-confirmation-email** - RSVP confirmations
5. **vendor-notification-email** - Vendor alerts
6. **budget-alert-email** - Budget warnings

## 🔧 Common Use Cases

### Send Reminder to All Guests
```typescript
const guests = await getGuests(); // Your function to get guests

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
        eventName: 'Wedding Ceremony',
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

### Send Thank You for Gift
```typescript
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: guest.email,
    subject: 'Thank You!',
    template: 'thank-you-email',
    templateProps: {
      guestName: guest.name,
      giftDescription: gift.description,
      personalMessage: 'Your thoughtful gift means the world to us!',
      coupleName: 'Sarah & Michael',
    },
  }),
});
```

### Send Budget Alert
```typescript
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: user.email,
    subject: 'Budget Alert',
    template: 'budget-alert-email',
    templateProps: {
      userName: user.name,
      eventName: 'Wedding',
      totalBudget: 50000,
      spentAmount: 55000,
      remainingAmount: -5000,
      overageAmount: 5000,
    },
  }),
});
```

## ⚡ Rate Limits

- **Per User:** 10 emails per hour
- **Per Recipient:** 3 emails per hour
- **Global:** 100 emails per hour

Rate limits reset automatically after the time window.

## 🐛 Troubleshooting

### Emails not sending?
1. Check Resend dashboard: https://resend.com/emails
2. Verify RESEND_API_KEY in .env.local
3. Check rate limits

### SMS not working?
1. Verify Twilio credentials in .env.local
2. Format phone numbers: `+15551234567` (E.164 format)
3. Check Twilio account balance

### Push notifications not showing?
1. Use HTTPS in production (required)
2. Check browser supports notifications
3. User must grant permission

## 📚 More Information

See **COMMUNICATION_SYSTEM_GUIDE.md** for:
- Complete API reference
- All template options
- Advanced features
- Security best practices
- Performance optimization

---

**Need Help?** Check the comprehensive guide or test in the Resend dashboard.
