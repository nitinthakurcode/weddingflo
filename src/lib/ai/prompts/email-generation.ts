export type EmailType =
  | 'wedding_invitation'
  | 'vendor_inquiry'
  | 'thank_you_note'
  | 'rsvp_followup'
  | 'save_the_date'
  | 'wedding_update'
  | 'vendor_coordination'
  | 'custom'

export type EmailTone =
  | 'formal'
  | 'casual'
  | 'friendly'
  | 'professional'
  | 'elegant'
  | 'warm'

export interface EmailGenerationInput {
  emailType: EmailType
  tone: EmailTone
  recipientName?: string
  senderName?: string
  eventDate?: string
  eventLocation?: string
  specificDetails?: string
  customInstructions?: string
}

export interface EmailGenerationResponse {
  subject: string
  body: string
  tone: EmailTone
  suggestions: string[]
  variations?: {
    subject: string
    openingLine: string
  }[]
}

export function generateEmailPrompt(input: EmailGenerationInput): string {
  const baseContext = `You are an expert wedding communication specialist who writes elegant, professional, and personalized emails.

Email Details:
- Type: ${input.emailType.replace('_', ' ')}
- Tone: ${input.tone}
${input.recipientName ? `- Recipient: ${input.recipientName}` : ''}
${input.senderName ? `- Sender: ${input.senderName}` : ''}
${input.eventDate ? `- Event Date: ${input.eventDate}` : ''}
${input.eventLocation ? `- Location: ${input.eventLocation}` : ''}
${input.specificDetails ? `- Details: ${input.specificDetails}` : ''}
${input.customInstructions ? `- Special Instructions: ${input.customInstructions}` : ''}
`

  const typeSpecificGuidance = getTypeSpecificGuidance(input.emailType)

  return `${baseContext}

${typeSpecificGuidance}

Generate a complete, professional email with:
1. A compelling subject line
2. A complete email body with proper greeting, content, and closing
3. 3-5 helpful suggestions for customization or improvement
4. 2-3 alternative subject lines or opening variations

Important guidelines:
- Match the ${input.tone} tone throughout
- Keep it concise but warm
- Use proper email formatting
- Include appropriate greetings and sign-offs
- Make it personal and genuine
- Avoid clichés and overly formal language unless the tone requires it

Respond ONLY with valid JSON in this exact format:
{
  "subject": "string",
  "body": "string (with \\n for line breaks)",
  "tone": "${input.tone}",
  "suggestions": ["string", "string", "string"],
  "variations": [
    {
      "subject": "alternative subject line",
      "openingLine": "alternative opening sentence"
    }
  ]
}`
}

function getTypeSpecificGuidance(emailType: EmailType): string {
  const guidance: Record<EmailType, string> = {
    wedding_invitation: `This is a wedding invitation email. Include:
- Warm, joyful tone
- Clear event details (date, time, location)
- RSVP instructions
- Any dress code or special notes
- Expression of excitement to celebrate together`,

    vendor_inquiry: `This is a vendor inquiry email. Include:
- Professional introduction
- Specific service needed
- Event date and details
- Request for availability and pricing
- Call to action for next steps`,

    thank_you_note: `This is a thank you note. Include:
- Sincere gratitude
- Specific mention of what you're thanking for
- Personal touch
- Warm closing`,

    rsvp_followup: `This is an RSVP follow-up email. Include:
- Polite reminder
- Deadline for response
- Easy way to respond
- Understanding and friendly tone`,

    save_the_date: `This is a save-the-date announcement. Include:
- Exciting announcement
- Date and location
- Note that formal invitation will follow
- Request to save the date`,

    wedding_update: `This is a wedding update/change notification. Include:
- Clear statement of what changed
- Updated information
- Apology if appropriate
- Reassurance and positive tone`,

    vendor_coordination: `This is vendor coordination email. Include:
- Professional tone
- Specific logistics or questions
- Timeline or schedule details
- Clear action items
- Contact information`,

    custom: `This is a custom email. Follow the user's specific instructions and maintain the requested tone.`,
  }

  return guidance[emailType] || guidance.custom
}
