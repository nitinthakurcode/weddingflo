import { Button, Heading, Text, Hr } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './base-email';

interface PaymentReceiptEmailProps {
  clientName: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
  description: string;
  remainingBalance?: string;
  receiptLink: string;
  locale?: string;
}

const TRANSLATIONS = {
  en: {
    greeting: (name: string) => `Dear ${name},`,
    subject: 'Payment Receipt',
    thankYou: 'Thank you for your payment!',
    message: 'We have successfully received your payment. Here are the details:',
    paymentDetails: 'Payment Details:',
    amount: 'Amount Paid:',
    date: 'Payment Date:',
    method: 'Payment Method:',
    transactionId: 'Transaction ID:',
    description: 'Description:',
    remainingBalance: 'Remaining Balance:',
    fullyPaid: 'Your account is fully paid. Thank you!',
    cta: 'Download Receipt',
    footer: 'Keep this receipt for your records.',
    questions: 'If you have any questions about this payment, please contact us.',
  },
  es: {
    greeting: (name: string) => `Estimado/a ${name},`,
    subject: 'Recibo de Pago',
    thankYou: '¡Gracias por su pago!',
    message: 'Hemos recibido exitosamente su pago. Aquí están los detalles:',
    paymentDetails: 'Detalles del Pago:',
    amount: 'Monto Pagado:',
    date: 'Fecha de Pago:',
    method: 'Método de Pago:',
    transactionId: 'ID de Transacción:',
    description: 'Descripción:',
    remainingBalance: 'Saldo Restante:',
    fullyPaid: 'Su cuenta está totalmente pagada. ¡Gracias!',
    cta: 'Descargar Recibo',
    footer: 'Conserve este recibo para sus registros.',
    questions: 'Si tiene alguna pregunta sobre este pago, contáctenos.',
  },
  fr: {
    greeting: (name: string) => `Cher/Chère ${name},`,
    subject: 'Reçu de Paiement',
    thankYou: 'Merci pour votre paiement!',
    message: 'Nous avons bien reçu votre paiement. Voici les détails:',
    paymentDetails: 'Détails du Paiement:',
    amount: 'Montant Payé:',
    date: 'Date de Paiement:',
    method: 'Méthode de Paiement:',
    transactionId: 'ID de Transaction:',
    description: 'Description:',
    remainingBalance: 'Solde Restant:',
    fullyPaid: 'Votre compte est entièrement payé. Merci!',
    cta: 'Télécharger le Reçu',
    footer: 'Conservez ce reçu pour vos dossiers.',
    questions: 'Si vous avez des questions sur ce paiement, contactez-nous.',
  },
  de: {
    greeting: (name: string) => `Liebe/r ${name},`,
    subject: 'Zahlungsbeleg',
    thankYou: 'Vielen Dank für Ihre Zahlung!',
    message: 'Wir haben Ihre Zahlung erfolgreich erhalten. Hier sind die Details:',
    paymentDetails: 'Zahlungsdetails:',
    amount: 'Bezahlter Betrag:',
    date: 'Zahlungsdatum:',
    method: 'Zahlungsmethode:',
    transactionId: 'Transaktions-ID:',
    description: 'Beschreibung:',
    remainingBalance: 'Verbleibendes Guthaben:',
    fullyPaid: 'Ihr Konto ist vollständig bezahlt. Danke!',
    cta: 'Beleg Herunterladen',
    footer: 'Bewahren Sie diesen Beleg für Ihre Unterlagen auf.',
    questions: 'Bei Fragen zu dieser Zahlung kontaktieren Sie uns bitte.',
  },
  ja: {
    greeting: (name: string) => `${name}様`,
    subject: '支払い領収書',
    thankYou: 'お支払いありがとうございます！',
    message: 'お支払いを正常に受領いたしました。詳細は以下の通りです：',
    paymentDetails: '支払い詳細：',
    amount: '支払い金額：',
    date: '支払い日：',
    method: '支払い方法：',
    transactionId: '取引ID：',
    description: '説明：',
    remainingBalance: '残高：',
    fullyPaid: 'アカウントは全額支払い済みです。ありがとうございます！',
    cta: '領収書をダウンロード',
    footer: 'この領収書は記録用に保管してください。',
    questions: 'この支払いについてご質問がある場合は、お問い合わせください。',
  },
  zh: {
    greeting: (name: string) => `亲爱的${name}，`,
    subject: '付款收据',
    thankYou: '感谢您的付款！',
    message: '我们已成功收到您的付款。以下是详细信息：',
    paymentDetails: '付款详情：',
    amount: '已付金额：',
    date: '付款日期：',
    method: '付款方式：',
    transactionId: '交易ID：',
    description: '描述：',
    remainingBalance: '剩余余额：',
    fullyPaid: '您的账户已全额支付。谢谢！',
    cta: '下载收据',
    footer: '请保留此收据作为记录。',
    questions: '如对此付款有任何疑问，请联系我们。',
  },
  hi: {
    greeting: (name: string) => `प्रिय ${name},`,
    subject: 'भुगतान रसीद',
    thankYou: 'आपके भुगतान के लिए धन्यवाद!',
    message: 'हमने आपका भुगतान सफलतापूर्वक प्राप्त कर लिया है। यहाँ विवरण हैं:',
    paymentDetails: 'भुगतान विवरण:',
    amount: 'भुगतान की गई राशि:',
    date: 'भुगतान तिथि:',
    method: 'भुगतान विधि:',
    transactionId: 'लेनदेन आईडी:',
    description: 'विवरण:',
    remainingBalance: 'शेष राशि:',
    fullyPaid: 'आपका खाता पूरी तरह से भुगतान किया गया है। धन्यवाद!',
    cta: 'रसीद डाउनलोड करें',
    footer: 'अपने रिकॉर्ड के लिए इस रसीद को रखें।',
    questions: 'यदि इस भुगतान के बारे में आपके कोई प्रश्न हैं, तो कृपया हमसे संपर्क करें।',
  },
};

export function PaymentReceiptEmail({
  clientName,
  amount,
  paymentDate,
  paymentMethod,
  transactionId,
  description,
  remainingBalance,
  receiptLink,
  locale = 'en',
}: PaymentReceiptEmailProps) {
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
  const isFullyPaid = !remainingBalance || remainingBalance === '$0' || remainingBalance === '0';

  return (
    <BaseEmail preview={t.subject} locale={locale}>
      <Heading style={h1}>{t.greeting(clientName)}</Heading>
      <Heading style={successHeading}>{t.thankYou}</Heading>
      <Text style={text}>{t.message}</Text>

      <Hr style={divider} />

      <Heading style={h2}>{t.paymentDetails}</Heading>
      <div style={receiptCard}>
        <Text style={amountPaid}>{amount}</Text>

        <Hr style={smallDivider} />

        <Text style={detailRow}>
          <strong>{t.date}</strong> {paymentDate}
        </Text>
        <Text style={detailRow}>
          <strong>{t.method}</strong> {paymentMethod}
        </Text>
        <Text style={detailRow}>
          <strong>{t.transactionId}</strong> {transactionId}
        </Text>

        <Hr style={smallDivider} />

        <Text style={detailRow}>
          <strong>{t.description}</strong>
        </Text>
        <Text style={detailText}>{description}</Text>

        {!isFullyPaid && remainingBalance && (
          <>
            <Hr style={smallDivider} />
            <Text style={balanceRow}>
              <strong>{t.remainingBalance}</strong> {remainingBalance}
            </Text>
          </>
        )}

        {isFullyPaid && (
          <>
            <Hr style={smallDivider} />
            <Text style={paidInFullText}>{t.fullyPaid}</Text>
          </>
        )}
      </div>

      <Button href={receiptLink} style={button}>
        {t.cta}
      </Button>

      <Text style={footerNote}>{t.footer}</Text>
      <Text style={footerNote}>{t.questions}</Text>
    </BaseEmail>
  );
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0 0 8px',
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

const successHeading = {
  color: '#10b981',
  fontSize: '24px',
  fontWeight: '700',
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

const receiptCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px',
  border: '2px solid #10b981',
};

const amountPaid = {
  color: '#10b981',
  fontSize: '32px',
  fontWeight: '700',
  lineHeight: '40px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const detailRow = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
};

const detailText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0 0',
};

const balanceRow = {
  color: '#ef4444',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0',
  textAlign: 'center' as const,
};

const paidInFullText = {
  color: '#10b981',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0',
  textAlign: 'center' as const,
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
  margin: '0 0 24px',
};

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
  fontStyle: 'italic',
  textAlign: 'center' as const,
};
