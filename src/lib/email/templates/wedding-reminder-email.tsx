import { Button, Heading, Text } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface WeddingReminderEmailProps {
  clientName: string;
  weddingDate: string;
  daysUntilWedding: number;
  dashboardLink: string;
  locale?: string;
}

const TRANSLATIONS = {
  en: {
    greeting: (name: string) => `Dear ${name},`,
    reminder: (days: number) => `Your special day is just ${days} ${days === 1 ? 'day' : 'days'} away!`,
    message: 'We wanted to send you a quick reminder about your upcoming wedding.',
    date: (date: string) => `Wedding Date: ${date}`,
    checklist: 'Here are some last-minute things to check:',
    item1: '✓ Confirm final guest count with vendors',
    item2: '✓ Review timeline with your wedding party',
    item3: '✓ Prepare payments for vendors',
    item4: '✓ Pack emergency kit for the day',
    cta: 'View Dashboard',
    closing: 'Wishing you a beautiful celebration!',
  },
  es: {
    greeting: (name: string) => `Estimado/a ${name},`,
    reminder: (days: number) => `¡Tu día especial está a solo ${days} ${days === 1 ? 'día' : 'días'}!`,
    message: 'Queríamos enviarte un recordatorio rápido sobre tu próxima boda.',
    date: (date: string) => `Fecha de la boda: ${date}`,
    checklist: 'Algunas cosas de último minuto para verificar:',
    item1: '✓ Confirmar número final de invitados con proveedores',
    item2: '✓ Revisar cronograma con tu cortejo nupcial',
    item3: '✓ Preparar pagos para proveedores',
    item4: '✓ Empacar kit de emergencia para el día',
    cta: 'Ver Panel',
    closing: '¡Deseándote una hermosa celebración!',
  },
  fr: {
    greeting: (name: string) => `Cher/Chère ${name},`,
    reminder: (days: number) => `Votre jour spécial est dans ${days} ${days === 1 ? 'jour' : 'jours'} seulement!`,
    message: 'Nous voulions vous envoyer un rappel rapide concernant votre prochain mariage.',
    date: (date: string) => `Date du mariage: ${date}`,
    checklist: 'Quelques points de dernière minute à vérifier:',
    item1: "✓ Confirmer le nombre final d'invités avec les fournisseurs",
    item2: '✓ Revoir le calendrier avec votre cortège',
    item3: '✓ Préparer les paiements pour les fournisseurs',
    item4: "✓ Préparer le kit d'urgence pour le jour J",
    cta: 'Voir le Tableau de Bord',
    closing: 'Nous vous souhaitons une belle célébration!',
  },
  de: {
    greeting: (name: string) => `Liebe/r ${name},`,
    reminder: (days: number) => `Ihr besonderer Tag ist nur noch ${days} ${days === 1 ? 'Tag' : 'Tage'} entfernt!`,
    message: 'Wir wollten Ihnen eine kurze Erinnerung an Ihre bevorstehende Hochzeit senden.',
    date: (date: string) => `Hochzeitsdatum: ${date}`,
    checklist: 'Hier sind einige Last-Minute-Dinge zu überprüfen:',
    item1: '✓ Endgültige Gästezahl mit Anbietern bestätigen',
    item2: '✓ Zeitplan mit Ihrer Hochzeitsgesellschaft überprüfen',
    item3: '✓ Zahlungen für Anbieter vorbereiten',
    item4: '✓ Notfallset für den Tag packen',
    cta: 'Dashboard Anzeigen',
    closing: 'Wir wünschen Ihnen eine wunderschöne Feier!',
  },
  ja: {
    greeting: (name: string) => `${name}様`,
    reminder: (days: number) => `特別な日まであと${days}日です！`,
    message: '今後の結婚式について、簡単なリマインダーをお送りしたいと思います。',
    date: (date: string) => `結婚式の日：${date}`,
    checklist: '直前に確認すべきこと：',
    item1: '✓ ベンダーと最終ゲスト数を確認',
    item2: '✓ ウェディングパーティーとタイムラインを確認',
    item3: '✓ ベンダーへの支払いを準備',
    item4: '✓ 当日の緊急キットを準備',
    cta: 'ダッシュボードを表示',
    closing: '素晴らしいお祝いをお祈りしています！',
  },
  zh: {
    greeting: (name: string) => `亲爱的${name}，`,
    reminder: (days: number) => `您的特别日子只剩${days}天了！`,
    message: '我们想向您发送有关即将举行的婚礼的快速提醒。',
    date: (date: string) => `婚礼日期：${date}`,
    checklist: '以下是一些最后时刻需要检查的事项：',
    item1: '✓ 与供应商确认最终宾客人数',
    item2: '✓ 与婚礼团队审查时间表',
    item3: '✓ 准备供应商付款',
    item4: '✓ 为当天准备应急包',
    cta: '查看仪表板',
    closing: '祝您庆祝愉快！',
  },
  hi: {
    greeting: (name: string) => `प्रिय ${name},`,
    reminder: (days: number) => `आपका विशेष दिन केवल ${days} दिन दूर है!`,
    message: 'हम आपको आपकी आगामी शादी के बारे में एक त्वरित अनुस्मारक भेजना चाहते थे।',
    date: (date: string) => `शादी की तारीख: ${date}`,
    checklist: 'यहां कुछ अंतिम समय की जांच करने वाली चीजें हैं:',
    item1: '✓ विक्रेताओं के साथ अंतिम अतिथि संख्या की पुष्टि करें',
    item2: '✓ अपने शादी के दल के साथ समयरेखा की समीक्षा करें',
    item3: '✓ विक्रेताओं के लिए भुगतान तैयार करें',
    item4: '✓ दिन के लिए आपातकालीन किट पैक करें',
    cta: 'डैशबोर्ड देखें',
    closing: 'आपको एक सुंदर उत्सव की शुभकामनाएं!',
  },
};

export function WeddingReminderEmail({
  clientName,
  weddingDate,
  daysUntilWedding,
  dashboardLink,
  locale = 'en',
}: WeddingReminderEmailProps) {
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  return (
    <BaseEmail preview={t.reminder(daysUntilWedding)} locale={locale}>
      <Heading style={h1}>{t.greeting(clientName)}</Heading>
      <Text style={highlightText}>{t.reminder(daysUntilWedding)}</Text>
      <Text style={text}>{t.message}</Text>

      <Text style={dateText}>{t.date(weddingDate)}</Text>

      <Text style={text}>{t.checklist}</Text>
      <Text style={checklistItem}>{t.item1}</Text>
      <Text style={checklistItem}>{t.item2}</Text>
      <Text style={checklistItem}>{t.item3}</Text>
      <Text style={checklistItem}>{t.item4}</Text>

      <Button href={dashboardLink} style={button}>
        {t.cta}
      </Button>

      <Text style={closing}>{t.closing}</Text>
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

const highlightText = {
  color: '#6366f1',
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '0 0 16px',
};

const dateText = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '12px',
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
};

const checklistItem = {
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

const closing = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0 0',
  fontStyle: 'italic',
};
