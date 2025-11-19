import { PushNotificationSender } from '@/lib/firebase/push-sender';

export class PushNotificationTriggers {
  /**
   * Send payment received notification
   */
  static async onPaymentReceived(
    userId: string,
    companyId: string,
    amount: number,
    currency: string
  ) {
    await PushNotificationSender.sendToUser({
      userId,
      companyId,
      title: 'Payment Received',
      body: `Payment of ${amount} ${currency} has been received`,
      notificationType: 'payment_alert',
      link: '/dashboard/payments',
    });
  }

  /**
   * Send payment failed notification
   */
  static async onPaymentFailed(
    userId: string,
    companyId: string,
    reason: string
  ) {
    await PushNotificationSender.sendToUser({
      userId,
      companyId,
      title: 'Payment Failed',
      body: `Payment failed: ${reason}`,
      notificationType: 'payment_alert',
      link: '/dashboard/payments',
    });
  }

  /**
   * Send RSVP update notification
   */
  static async onRsvpUpdate(
    userId: string,
    companyId: string,
    guestName: string,
    status: string
  ) {
    await PushNotificationSender.sendToUser({
      userId,
      companyId,
      title: 'New RSVP Response',
      body: `${guestName} has ${status} the invitation`,
      notificationType: 'rsvp_update',
      link: '/dashboard/guests',
    });
  }

  /**
   * Send event reminder notification
   */
  static async onEventReminder(
    userId: string,
    companyId: string,
    eventTitle: string,
    timeUntil: string
  ) {
    await PushNotificationSender.sendToUser({
      userId,
      companyId,
      title: 'Event Reminder',
      body: `${eventTitle} is ${timeUntil} away`,
      notificationType: 'event_reminder',
      link: '/dashboard/events',
    });
  }

  /**
   * Send task deadline notification
   */
  static async onTaskDeadline(
    userId: string,
    companyId: string,
    taskTitle: string,
    dueDate: string
  ) {
    await PushNotificationSender.sendToUser({
      userId,
      companyId,
      title: 'Task Deadline Approaching',
      body: `"${taskTitle}" is due ${dueDate}`,
      notificationType: 'task_deadline',
      link: '/dashboard/tasks',
    });
  }

  /**
   * Send vendor message notification
   */
  static async onVendorMessage(
    userId: string,
    companyId: string,
    vendorName: string,
    preview: string
  ) {
    await PushNotificationSender.sendToUser({
      userId,
      companyId,
      title: `Message from ${vendorName}`,
      body: preview,
      notificationType: 'vendor_message',
      link: '/dashboard/messages',
    });
  }
}
