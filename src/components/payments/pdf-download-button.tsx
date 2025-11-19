'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PDFDownloadButtonProps {
  paymentId: string;
  invoiceNumber?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PDFDownloadButton({
  paymentId,
  invoiceNumber,
  variant = 'ghost',
  size = 'sm',
}: PDFDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

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

        toast.success('Invoice PDF downloaded successfully');
      } catch (error) {
        console.error('Error downloading PDF:', error);
        toast.error('Failed to download PDF');
      } finally {
        setIsDownloading(false);
      }
    },
    onError: (error) => {
      console.error('Error generating PDF:', error);
      toast.error(error.message || 'Failed to generate PDF');
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
      title={invoiceNumber ? `Download invoice ${invoiceNumber}` : 'Download invoice'}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </>
      )}
    </Button>
  );
}
