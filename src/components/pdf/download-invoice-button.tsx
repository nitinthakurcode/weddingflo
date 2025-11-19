'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from '@/hooks/use-translations';

interface DownloadInvoiceButtonProps {
  paymentId: string;
  invoiceNumber?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export function DownloadInvoiceButton({
  paymentId,
  invoiceNumber,
  variant = 'ghost',
  size = 'sm',
  showText = true,
}: DownloadInvoiceButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const t = useTranslations();

  const generatePDF = trpc.pdf.generateInvoicePDF.useMutation({
    onSuccess: (data) => {
      try {
        // Convert base64 to blob
        const byteCharacters = atob(data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(t('pdf.success.downloaded'));
      } catch (error) {
        console.error('Error downloading PDF:', error);
        toast.error(t('pdf.error.downloadFailed'));
      } finally {
        setIsDownloading(false);
      }
    },
    onError: (error) => {
      console.error('Error generating PDF:', error);
      toast.error(error.message || t('pdf.error.generateFailed'));
      setIsDownloading(false);
    },
  });

  const handleDownload = () => {
    setIsDownloading(true);
    generatePDF.mutate({ paymentId });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isDownloading}
      title={invoiceNumber ? `${t('pdf.downloadInvoice')} ${invoiceNumber}` : t('pdf.downloadInvoice')}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {showText && <span className="ml-2">{t('pdf.generating')}</span>}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {showText && <span className="ml-2">{t('pdf.downloadPDF')}</span>}
        </>
      )}
    </Button>
  );
}
