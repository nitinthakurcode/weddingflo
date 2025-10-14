import { openai, AI_MODELS, AI_DEFAULTS } from './openai-client';

export type EmailType =
  | 'invitation'
  | 'save_the_date'
  | 'reminder'
  | 'thank_you'
  | 'vendor_inquiry'
  | 'vendor_confirmation'
  | 'update'
  | 'custom';

export interface EmailGenerationRequest {
  type: EmailType;
  recipientName?: string;
  recipientType: 'guest' | 'vendor' | 'group';
  eventDetails?: {
    eventName?: string;
    eventDate?: string;
    eventLocation?: string;
    eventTime?: string;
  };
  customInstructions?: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  suggestions: string[];
}

export async function generateEmail(
  request: EmailGenerationRequest
): Promise<GeneratedEmail> {
  const tone = request.tone || 'friendly';

  const typeDescriptions: Record<EmailType, string> = {
    invitation: 'formal wedding invitation with RSVP details',
    save_the_date: 'save the date announcement with key information',
    reminder: 'friendly reminder about upcoming event or RSVP deadline',
    thank_you: 'heartfelt thank you message',
    vendor_inquiry: 'professional inquiry to a wedding vendor',
    vendor_confirmation: 'confirmation message for vendor booking',
    update: 'update about event changes or new information',
    custom: request.customInstructions || 'general wedding-related email',
  };

  const prompt = `You are a professional wedding communication writer. Generate a ${tone} email for the following:

EMAIL TYPE: ${typeDescriptions[request.type]}
RECIPIENT: ${request.recipientName || 'Guest/Vendor'}
RECIPIENT TYPE: ${request.recipientType}
${request.eventDetails?.eventName ? `EVENT: ${request.eventDetails.eventName}` : ''}
${request.eventDetails?.eventDate ? `DATE: ${request.eventDetails.eventDate}` : ''}
${request.eventDetails?.eventTime ? `TIME: ${request.eventDetails.eventTime}` : ''}
${request.eventDetails?.eventLocation ? `LOCATION: ${request.eventDetails.eventLocation}` : ''}
${request.customInstructions ? `CUSTOM INSTRUCTIONS: ${request.customInstructions}` : ''}

GUIDELINES:
- Use a ${tone} tone throughout
- Include all relevant details
- Make it ${request.recipientType === 'vendor' ? 'professional and clear' : 'warm and inviting'}
- Keep it concise but complete
- Include appropriate call-to-action (RSVP, confirmation, etc.)
- Use proper email formatting

Respond ONLY with valid JSON in this exact format:
{
  "subject": "Email subject line",
  "body": "Full email body with proper formatting (use \\n for line breaks)",
  "suggestions": [
    "Optional: suggestion to personalize",
    "Optional: suggestion to enhance"
  ]
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODELS.SIMPLE, // Use cheaper model for email generation
    messages: [
      {
        role: 'system',
        content: 'You are an expert wedding communication writer with experience in crafting elegant, appropriate, and effective wedding-related emails.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: AI_DEFAULTS.temperature,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const result = JSON.parse(content);
  return result as GeneratedEmail;
}
