/**
 * Email queue system to prevent blocking UI
 * Processes emails in the background
 */

interface QueuedEmail {
  id: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  priority: 'high' | 'normal' | 'low';
  retries: number;
  maxRetries: number;
  scheduledAt?: number;
  createdAt: number;
}

class EmailQueue {
  private queue: QueuedEmail[] = [];
  private processing = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start processing queue every 5 seconds
    if (typeof window === 'undefined') {
      this.startProcessing();
    }
  }

  /**
   * Add email to queue
   */
  add(email: Omit<QueuedEmail, 'id' | 'retries' | 'createdAt'>) {
    const queuedEmail: QueuedEmail = {
      ...email,
      id: this.generateId(),
      retries: 0,
      createdAt: Date.now(),
    };

    // Add to queue based on priority
    if (email.priority === 'high') {
      this.queue.unshift(queuedEmail);
    } else {
      this.queue.push(queuedEmail);
    }

    return queuedEmail.id;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get all queued emails
   */
  getAll(): QueuedEmail[] {
    return [...this.queue];
  }

  /**
   * Remove email from queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex((e) => e.id === id);
    if (index > -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all queued emails
   */
  clear() {
    this.queue = [];
  }

  /**
   * Start processing queue
   */
  private startProcessing() {
    if (this.processInterval) return;

    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Stop processing queue
   */
  stopProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  /**
   * Process queued emails
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    try {
      // Get next email to process
      const email = this.queue[0];

      // Check if email is scheduled for later
      if (email.scheduledAt && email.scheduledAt > Date.now()) {
        this.processing = false;
        return;
      }

      // Remove from queue
      this.queue.shift();

      // Import sendEmail dynamically to avoid circular dependency
      const { sendEmail } = await import('./resend-client');

      // Send email
      const result = await sendEmail({
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        from: email.from,
      });

      if (!result.success && email.retries < email.maxRetries) {
        // Re-queue with increased retry count
        email.retries++;
        this.queue.push(email);
        console.warn(
          `Email failed, retrying (${email.retries}/${email.maxRetries}):`,
          email.subject
        );
      } else if (!result.success) {
        console.error('Email failed after max retries:', email.subject);
      } else {
        console.log('Email sent successfully:', email.subject);
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const emailQueue = new EmailQueue();

/**
 * Add email to queue
 */
export function queueEmail(
  email: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    scheduledAt?: number;
  },
  priority: 'high' | 'normal' | 'low' = 'normal',
  maxRetries: number = 3
) {
  return emailQueue.add({
    ...email,
    priority,
    maxRetries,
  });
}

/**
 * Get queue status
 */
export function getQueueStatus() {
  return {
    size: emailQueue.size(),
    emails: emailQueue.getAll(),
  };
}
