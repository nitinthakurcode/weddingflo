import { Button, Heading, Text, Hr } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface RsvpConfirmationEmailProps {
  guestName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  attending: boolean;
  guestCount?: number;
  dietaryRestrictions?: string;
  specialRequests?: string;
  locale?: string;
}

const TRANSLATIONS = {
  en: {
    greeting: (name: string) => `Dear ${name},`,
    confirmed: 'RSVP Confirmed!',
    thankYou: 'Thank you for confirming your attendance.',
    declined: 'RSVP Declined',
    sorryMissYou: "We're sorry you can't make it, but we understand. We'll miss you!",
    eventDetails: 'Event Details:',
    event: 'Event:',
    date: 'Date:',
    location: 'Location:',
    guestCount: (count: number) => `Number of Guests: ${count}`,
    dietaryRestrictions: 'Dietary Restrictions:',
    specialRequests: 'Special Requests:',
    lookingForward: "We're looking forward to celebrating with you!",
    questions: 'If you have any questions or need to make changes, please contact us.',
    cta: 'View Event Details',
  },
  es: {
    greeting: (name: string) => `Estimado/a ${name},`,
    confirmed: '¡RSVP Confirmado!',
    thankYou: 'Gracias por confirmar tu asistencia.',
    declined: 'RSVP Declinado',
    sorryMissYou: '¡Lamentamos que no puedas asistir, pero lo entendemos. Te extrañaremos!',
    eventDetails: 'Detalles del Evento:',
    event: 'Evento:',
    date: 'Fecha:',
    location: 'Ubicación:',
    guestCount: (count: number) => `Número de Invitados: ${count}`,
    dietaryRestrictions: 'Restricciones Dietéticas:',
    specialRequests: 'Solicitudes Especiales:',
    lookingForward: '¡Esperamos celebrar contigo!',
    questions: 'Si tienes alguna pregunta o necesitas hacer cambios, contáctanos.',
    cta: 'Ver Detalles del Evento',
  },
  fr: {
    greeting: (name: string) => `Cher/Chère ${name},`,
    confirmed: 'RSVP Confirmé!',
    thankYou: "Merci d'avoir confirmé votre présence.",
    declined: 'RSVP Décliné',
    sorryMissYou: 'Nous sommes désolés que vous ne puissiez pas venir, mais nous comprenons. Vous nous manquerez!',
    eventDetails: "Détails de l'Événement:",
    event: 'Événement:',
    date: 'Date:',
    location: 'Lieu:',
    guestCount: (count: number) => `Nombre d'Invités: ${count}`,
    dietaryRestrictions: 'Restrictions Alimentaires:',
    specialRequests: 'Demandes Spéciales:',
    lookingForward: 'Nous avons hâte de célébrer avec vous!',
    questions: 'Si vous avez des questions ou devez apporter des modifications, contactez-nous.',
    cta: 'Voir les Détails',
  },
  de: {
    greeting: (name: string) => `Liebe/r ${name},`,
    confirmed: 'RSVP Bestätigt!',
    thankYou: 'Vielen Dank für die Bestätigung Ihrer Teilnahme.',
    declined: 'RSVP Abgelehnt',
    sorryMissYou: 'Es tut uns leid, dass Sie nicht kommen können, aber wir verstehen das. Wir werden Sie vermissen!',
    eventDetails: 'Veranstaltungsdetails:',
    event: 'Veranstaltung:',
    date: 'Datum:',
    location: 'Ort:',
    guestCount: (count: number) => `Anzahl der Gäste: ${count}`,
    dietaryRestrictions: 'Ernährungseinschränkungen:',
    specialRequests: 'Besondere Wünsche:',
    lookingForward: 'Wir freuen uns darauf, mit Ihnen zu feiern!',
    questions: 'Bei Fragen oder Änderungswünschen kontaktieren Sie uns bitte.',
    cta: 'Details Anzeigen',
  },
  ja: {
    greeting: (name: string) => `${name}様`,
    confirmed: 'RSVP確認完了！',
    thankYou: 'ご出席の確認をいただきありがとうございます。',
    declined: 'RSVP辞退',
    sorryMissYou: 'ご参加いただけないのは残念ですが、理解しております。お会いできないのは残念です！',
    eventDetails: 'イベント詳細：',
    event: 'イベント：',
    date: '日付：',
    location: '場所：',
    guestCount: (count: number) => `ゲスト数：${count}名`,
    dietaryRestrictions: '食事制限：',
    specialRequests: '特別なリクエスト：',
    lookingForward: 'お祝いを楽しみにしています！',
    questions: 'ご質問や変更がございましたら、お問い合わせください。',
    cta: 'イベント詳細を表示',
  },
  zh: {
    greeting: (name: string) => `亲爱的${name}，`,
    confirmed: 'RSVP已确认！',
    thankYou: '感谢您确认出席。',
    declined: 'RSVP已拒绝',
    sorryMissYou: '很遗憾您无法参加，但我们理解。我们会想念您的！',
    eventDetails: '活动详情：',
    event: '活动：',
    date: '日期：',
    location: '地点：',
    guestCount: (count: number) => `宾客人数：${count}`,
    dietaryRestrictions: '饮食限制：',
    specialRequests: '特殊要求：',
    lookingForward: '我们期待与您共同庆祝！',
    questions: '如有任何问题或需要更改，请联系我们。',
    cta: '查看活动详情',
  },
  hi: {
    greeting: (name: string) => `प्रिय ${name},`,
    confirmed: 'RSVP पुष्टि हो गई!',
    thankYou: 'आपकी उपस्थिति की पुष्टि के लिए धन्यवाद।',
    declined: 'RSVP अस्वीकृत',
    sorryMissYou: 'हमें खेद है कि आप नहीं आ सकते, लेकिन हम समझते हैं। हम आपको याद करेंगे!',
    eventDetails: 'कार्यक्रम विवरण:',
    event: 'कार्यक्रम:',
    date: 'तारीख:',
    location: 'स्थान:',
    guestCount: (count: number) => `अतिथियों की संख्या: ${count}`,
    dietaryRestrictions: 'आहार प्रतिबंध:',
    specialRequests: 'विशेष अनुरोध:',
    lookingForward: 'हम आपके साथ जश्न मनाने के लिए उत्सुक हैं!',
    questions: 'यदि आपके कोई प्रश्न हैं या परिवर्तन करने की आवश्यकता है, तो कृपया हमसे संपर्क करें।',
    cta: 'कार्यक्रम विवरण देखें',
  },
};

export function RsvpConfirmationEmail({
  guestName,
  eventName,
  eventDate,
  eventLocation,
  attending,
  guestCount,
  dietaryRestrictions,
  specialRequests,
  locale = 'en',
}: RsvpConfirmationEmailProps) {
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  return (
    <BaseEmail preview={attending ? t.confirmed : t.declined} locale={locale}>
      <Heading style={h1}>{t.greeting(guestName)}</Heading>

      {attending ? (
        <>
          <Heading style={confirmHeading}>{t.confirmed}</Heading>
          <Text style={text}>{t.thankYou}</Text>
        </>
      ) : (
        <>
          <Heading style={declineHeading}>{t.declined}</Heading>
          <Text style={text}>{t.sorryMissYou}</Text>
        </>
      )}

      <Hr style={divider} />

      <Heading style={h2}>{t.eventDetails}</Heading>
      <div style={detailsCard}>
        <Text style={detailRow}>
          <strong>{t.event}</strong> {eventName}
        </Text>
        <Text style={detailRow}>
          <strong>{t.date}</strong> {eventDate}
        </Text>
        <Text style={detailRow}>
          <strong>{t.location}</strong> {eventLocation}
        </Text>

        {attending && guestCount && (
          <Text style={detailRow}>
            <strong>{t.guestCount(guestCount)}</strong>
          </Text>
        )}

        {attending && dietaryRestrictions && (
          <>
            <Hr style={smallDivider} />
            <Text style={detailRow}>
              <strong>{t.dietaryRestrictions}</strong>
            </Text>
            <Text style={detailText}>{dietaryRestrictions}</Text>
          </>
        )}

        {attending && specialRequests && (
          <>
            <Hr style={smallDivider} />
            <Text style={detailRow}>
              <strong>{t.specialRequests}</strong>
            </Text>
            <Text style={detailText}>{specialRequests}</Text>
          </>
        )}
      </div>

      {attending && <Text style={lookingForwardText}>{t.lookingForward}</Text>}

      <Text style={footerNote}>{t.questions}</Text>
    </BaseEmail>
  );
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0 0 16px',
};

const h2 = {
  color: '#374151',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '24px 0 16px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const confirmHeading = {
  color: '#10b981',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '36px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const declineHeading = {
  color: '#6b7280',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const smallDivider = {
  borderColor: '#e5e7eb',
  margin: '12px 0',
};

const detailsCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px',
  border: '1px solid #e5e7eb',
};

const detailRow = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 12px',
};

const detailText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0 0',
};

const lookingForwardText = {
  color: '#6366f1',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0 0',
  fontStyle: 'italic',
  textAlign: 'center' as const,
};
