/**
 * Defensive msw stubs for ALL external side-effect SDKs (Rail 3).
 *
 * The audited flows (Excel/Sheets/chatbot/cascade) reach ONLY Redis — but per user
 * directive we stub email/SMS/push/payments/S3 at the HTTP boundary regardless, so no
 * test can EVER fan out to a real send/charge/upload even if a flow changes later.
 *
 * IMPORTANT: `onUnhandledRequest: 'bypass'` (set where the server is started) lets the
 * real SRH/Redis REST calls (127.0.0.1:8079) and Postgres pass through untouched.
 */
import { http, HttpResponse } from 'msw';

export const sideEffectHandlers = [
  // Resend (email)
  http.post('https://api.resend.com/*', () =>
    HttpResponse.json({ id: 'test-inert-email', stubbed: true }, { status: 200 }),
  ),
  // Twilio (SMS / WhatsApp)
  http.post('https://api.twilio.com/*', () =>
    HttpResponse.json({ sid: 'SMtest_inert', status: 'queued', stubbed: true }, { status: 201 }),
  ),
  // Stripe (payments)
  http.all('https://api.stripe.com/*', () =>
    HttpResponse.json({ id: 'test_inert', object: 'stub', stubbed: true }, { status: 200 }),
  ),
  // Firebase Cloud Messaging (push)
  http.post('https://fcm.googleapis.com/*', () =>
    HttpResponse.json({ name: 'projects/test-inert/messages/stub', stubbed: true }, { status: 200 }),
  ),
  // Cloudflare R2 / S3 — inert endpoint; intercept any PUT/GET/DELETE/HEAD
  http.all('http://127.0.0.1:9/*', () => new HttpResponse(null, { status: 200 })),
];
