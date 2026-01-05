import { http, HttpResponse } from 'msw'

/**
 * MSW Request Handlers
 * Mock API responses for testing
 * @see TESTING_INFRASTRUCTURE_COMPLETE - Session 52
 */

export const handlers = [
  // Mock tRPC endpoints
  http.post('/api/trpc/clients.getAll', () => {
    return HttpResponse.json({
      result: {
        data: [
          {
            id: 'client-1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            wedding_date: '2025-06-15',
            status: 'active',
            company_id: 'test-company-id',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
    })
  }),

  http.post('/api/trpc/guests.getByClient', () => {
    return HttpResponse.json({
      result: {
        data: [
          {
            id: 'guest-1',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com',
            rsvp_status: 'pending',
            client_id: 'client-1',
            company_id: 'test-company-id',
            dietary_restrictions: [],
            created_at: new Date().toISOString(),
          },
        ],
      },
    })
  }),

  http.post('/api/trpc/budget.getByClient', () => {
    return HttpResponse.json({
      result: {
        data: [
          {
            id: 'budget-1',
            client_id: 'client-1',
            company_id: 'test-company-id',
            category: 'venue',
            name: 'Venue Rental',
            estimated_cost: 5000,
            actual_cost: 4800,
            paid: false,
            created_at: new Date().toISOString(),
          },
        ],
      },
    })
  }),

  // Mock Stripe endpoint
  http.post('https://api.stripe.com/v1/payment_intents', () => {
    return HttpResponse.json({
      id: 'pi_test_123',
      amount: 10000,
      currency: 'usd',
      status: 'succeeded',
      client_secret: 'pi_test_123_secret_test',
    })
  }),

  http.post('https://api.stripe.com/v1/checkout/sessions', () => {
    return HttpResponse.json({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
      payment_status: 'unpaid',
    })
  }),

  // Mock OpenAI endpoint (DeepSeek API)
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a test AI response for budget prediction.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    })
  }),

  // Mock Resend API (Email)
  http.post('https://api.resend.com/emails', () => {
    return HttpResponse.json({
      id: 'email-123',
      from: 'noreply@weddingflow.com',
      to: ['client@example.com'],
      subject: 'Test Email',
      created_at: new Date().toISOString(),
    })
  }),

  // Mock Twilio API (SMS)
  http.post(/https:\/\/api\.twilio\.com\/.*\/Messages\.json/, () => {
    return HttpResponse.json({
      sid: 'SM123',
      status: 'sent',
      to: '+1234567890',
      from: '+1987654321',
      body: 'Test SMS',
      date_created: new Date().toISOString(),
    })
  }),

  // Mock BetterAuth session endpoint
  http.get('/api/auth/session', () => {
    return HttpResponse.json({
      session: {
        id: 'session-123',
        userId: 'user_123',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
      user: {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'company_admin',
        companyId: 'test-company-id',
      },
    })
  }),

  // Mock R2/Cloudflare Storage
  http.post(/.*\/storage\/v1\/object\/.*/, () => {
    return HttpResponse.json({
      Key: 'test-file.pdf',
      Id: 'file-123',
    })
  }),

  http.get(/.*\/storage\/v1\/object\/public\/.*/, () => {
    return new HttpResponse(new Blob(['test file content']), {
      headers: {
        'Content-Type': 'application/pdf',
      },
    })
  }),
]
