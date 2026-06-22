import { sendEmail } from './resend-client';

/**
 * Lightweight branded notification email for transactional document/links
 * (proposals, contracts, questionnaires, billing notices).
 *
 * Best-effort by contract: it never throws. Callers wire it after their own
 * mutation has committed, so a delivery failure is logged and surfaced via the
 * returned `success` flag but does not roll back or break the calling flow.
 */
export async function sendNotificationEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  /** Body paragraphs, rendered in order. */
  lines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, subject, heading, lines, ctaLabel, ctaUrl } = opts;

  const paragraphs = lines
    .map((l) => `<p style="margin: 8px 0; color: #1a1a2e; font-size: 15px;">${l}</p>`)
    .join('');

  const cta =
    ctaLabel && ctaUrl
      ? `<p style="margin: 24px 0;">
           <a href="${ctaUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
             ${ctaLabel}
           </a>
         </p>`
      : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a2e; margin-bottom: 16px;">${heading}</h2>
      ${paragraphs}
      ${cta}
      <p style="color: #888; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
        Sent by WeddingFlo. Please do not reply to this automated message.
      </p>
    </div>
  `;

  try {
    const result = await sendEmail({ to, subject, html });
    return { success: result.success, error: result.error ?? undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
