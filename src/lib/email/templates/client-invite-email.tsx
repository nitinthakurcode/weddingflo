import { Button, Heading, Text } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface ClientInviteEmailProps {
  clientName: string;
  plannerName: string;
  inviteLink: string;
  locale?: string;
}

const TRANSLATIONS = {
  en: {
    greeting: (name: string) => `Hello ${name}!`,
    intro: (planner: string) => `${planner} has invited you to join WeddingFlow Pro to plan your upcoming wedding.`,
    features: 'With WeddingFlow Pro, you can:',
    feature1: '📋 Manage your guest list and RSVPs',
    feature2: '💰 Track your budget and payments',
    feature3: '📅 Plan your timeline and schedule',
    feature4: '💬 Communicate with your wedding planner in real-time',
    cta: 'Accept Invitation',
    footer: 'This invitation will expire in 7 days.',
  },
  es: {
    greeting: (name: string) => `¡Hola ${name}!`,
    intro: (planner: string) => `${planner} te ha invitado a unirte a WeddingFlow Pro para planificar tu próxima boda.`,
    features: 'Con WeddingFlow Pro, puedes:',
    feature1: '📋 Gestionar tu lista de invitados y RSVPs',
    feature2: '💰 Hacer seguimiento de tu presupuesto y pagos',
    feature3: '📅 Planificar tu cronograma y horario',
    feature4: '💬 Comunicarte con tu organizador de bodas en tiempo real',
    cta: 'Aceptar Invitación',
    footer: 'Esta invitación caducará en 7 días.',
  },
  fr: {
    greeting: (name: string) => `Bonjour ${name}!`,
    intro: (planner: string) => `${planner} vous a invité à rejoindre WeddingFlow Pro pour planifier votre prochain mariage.`,
    features: 'Avec WeddingFlow Pro, vous pouvez:',
    feature1: "📋 Gérer votre liste d'invités et RSVPs",
    feature2: '💰 Suivre votre budget et paiements',
    feature3: '📅 Planifier votre calendrier et horaire',
    feature4: '💬 Communiquer avec votre organisateur en temps réel',
    cta: "Accepter l'Invitation",
    footer: 'Cette invitation expirera dans 7 jours.',
  },
  de: {
    greeting: (name: string) => `Hallo ${name}!`,
    intro: (planner: string) => `${planner} hat Sie eingeladen, WeddingFlow Pro beizutreten, um Ihre bevorstehende Hochzeit zu planen.`,
    features: 'Mit WeddingFlow Pro können Sie:',
    feature1: '📋 Ihre Gästeliste und RSVPs verwalten',
    feature2: '💰 Ihr Budget und Zahlungen verfolgen',
    feature3: '📅 Ihren Zeitplan planen',
    feature4: '💬 In Echtzeit mit Ihrem Hochzeitsplaner kommunizieren',
    cta: 'Einladung Annehmen',
    footer: 'Diese Einladung läuft in 7 Tagen ab.',
  },
  ja: {
    greeting: (name: string) => `こんにちは、${name}さん！`,
    intro: (planner: string) => `${planner}さんがあなたをWeddingFlow Proに招待し、今後の結婚式を計画できるようになりました。`,
    features: 'WeddingFlow Proでできること：',
    feature1: '📋 ゲストリストとRSVPの管理',
    feature2: '💰 予算と支払いの追跡',
    feature3: '📅 タイムラインとスケジュールの計画',
    feature4: '💬 ウェディングプランナーとリアルタイムでコミュニケーション',
    cta: '招待を受ける',
    footer: 'この招待は7日後に期限切れになります。',
  },
  zh: {
    greeting: (name: string) => `你好，${name}！`,
    intro: (planner: string) => `${planner}邀请您加入WeddingFlow Pro来策划您即将举行的婚礼。`,
    features: '使用WeddingFlow Pro，您可以：',
    feature1: '📋 管理您的宾客名单和RSVPs',
    feature2: '💰 跟踪您的预算和付款',
    feature3: '📅 规划您的时间表和日程',
    feature4: '💬 与您的婚礼策划师实时沟通',
    cta: '接受邀请',
    footer: '此邀请将在7天后过期。',
  },
  hi: {
    greeting: (name: string) => `नमस्ते ${name}!`,
    intro: (planner: string) => `${planner} ने आपको अपनी आगामी शादी की योजना बनाने के लिए WeddingFlow Pro में शामिल होने के लिए आमंत्रित किया है।`,
    features: 'WeddingFlow Pro के साथ, आप कर सकते हैं:',
    feature1: '📋 अपनी अतिथि सूची और RSVPs प्रबंधित करें',
    feature2: '💰 अपने बजट और भुगतान को ट्रैक करें',
    feature3: '📅 अपनी समयरेखा और कार्यक्रम की योजना बनाएं',
    feature4: '💬 अपने शादी के योजनाकार के साथ रीयल-टाइम में संवाद करें',
    cta: 'आमंत्रण स्वीकार करें',
    footer: 'यह आमंत्रण 7 दिनों में समाप्त हो जाएगा।',
  },
};

export function ClientInviteEmail({
  clientName,
  plannerName,
  inviteLink,
  locale = 'en',
}: ClientInviteEmailProps) {
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  return (
    <BaseEmail preview={t.greeting(clientName)} locale={locale}>
      <Heading style={h1}>{t.greeting(clientName)}</Heading>
      <Text style={text}>{t.intro(plannerName)}</Text>

      <Text style={text}>{t.features}</Text>
      <Text style={featureText}>{t.feature1}</Text>
      <Text style={featureText}>{t.feature2}</Text>
      <Text style={featureText}>{t.feature3}</Text>
      <Text style={featureText}>{t.feature4}</Text>

      <Button href={inviteLink} style={button}>
        {t.cta}
      </Button>

      <Text style={footerNote}>{t.footer}</Text>
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

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const featureText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
  paddingLeft: '8px',
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0',
  fontStyle: 'italic',
};
