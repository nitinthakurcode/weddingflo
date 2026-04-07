'use client';

import { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileSignature, CheckCircle2, Clock, X, AlertCircle,
  Pen, Type, RotateCcw, Download, Send,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useTranslations } from 'next-intl';

type SignMode = 'draw' | 'type';

export default function SignDocumentPage() {
  const params = useParams();
  const token = params.token as string;
  const t = useTranslations('documents');

  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [signMode, setSignMode] = useState<SignMode>('draw');
  const [typedName, setTypedName] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [signed, setSigned] = useState(false);
  const [declined, setDeclined] = useState(false);

  const { data: session, isLoading, error } = trpc.documents.getSigningSession.useQuery(
    { token },
    { retry: false }
  );

  const signMutation = trpc.documents.signDocument.useMutation({
    onSuccess: () => setSigned(true),
  });

  const declineMutation = trpc.documents.declineSignature.useMutation({
    onSuccess: () => setDeclined(true),
  });

  const handleSign = () => {
    let signatureData: string;

    if (signMode === 'draw') {
      if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return;
      signatureData = sigCanvasRef.current.toDataURL('image/png');
    } else {
      if (!typedName.trim()) return;
      // Generate signature from typed name using canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 100);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'italic 36px "Georgia", serif';
      ctx.fillText(typedName, 20, 65);
      signatureData = canvas.toDataURL('image/png');
    }

    signMutation.mutate({
      token,
      signature: signatureData,
      name: session?.signer.name || typedName || 'Signer',
      ipAddress: undefined, // Client IP captured server-side if needed
      userAgent: navigator.userAgent,
    });
  };

  const handleDecline = () => {
    declineMutation.mutate({
      token,
      reason: declineReason || undefined,
    });
  };

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
    setTypedName('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Signing Link Invalid</h2>
            <p className="text-muted-foreground">
              {error?.message || 'This signing link is no longer valid or has expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-semibold mb-2">Document Signed!</h2>
            <p className="text-muted-foreground">
              Thank you for signing &quot;{session.request.title}&quot;. All parties will be notified.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <X className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-semibold mb-2">Signature Declined</h2>
            <p className="text-muted-foreground">
              You have declined to sign &quot;{session.request.title}&quot;. The requesting party has been notified.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.signer.status === 'signed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-semibold mb-2">Already Signed</h2>
            <p className="text-muted-foreground">
              You have already signed &quot;{session.request.title}&quot;.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileSignature className="h-8 w-8 text-teal-600" />
              <div>
                <CardTitle className="text-xl">{session.request.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Signing as: <strong>{session.signer.name}</strong>
                  {session.signer.role && ` (${session.signer.role})`}
                </p>
              </div>
            </div>
          </CardHeader>
          {session.request.message && (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{session.request.message}</p>
            </CardContent>
          )}
        </Card>

        {/* Document Preview */}
        {session.document && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileSignature className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{session.document.name}</p>
                  <p className="text-sm text-muted-foreground">{session.document.type || 'Document'}</p>
                </div>
                {session.document.url && (
                  <Button variant="outline" size="sm" className="ml-auto" asChild>
                    <a href={session.document.url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3 h-3 mr-1" /> View
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signing Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signing Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {session.allSigners.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                      {idx + 1}
                    </span>
                    <span className={s.id === session.signer.id ? 'font-semibold' : ''}>
                      {s.name}
                    </span>
                    {s.role && <Badge variant="outline" className="text-xs">{s.role}</Badge>}
                  </div>
                  {s.status === 'signed' ? (
                    <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Signed</Badge>
                  ) : s.status === 'declined' ? (
                    <Badge className="bg-red-100 text-red-700"><X className="w-3 h-3 mr-1" />Declined</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Signature Pad */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Your Signature</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant={signMode === 'draw' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSignMode('draw')}
                >
                  <Pen className="w-3 h-3 mr-1" /> Draw
                </Button>
                <Button
                  variant={signMode === 'type' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSignMode('type')}
                >
                  <Type className="w-3 h-3 mr-1" /> Type
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {signMode === 'draw' ? (
              <div className="border-2 border-dashed rounded-lg relative bg-white">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="black"
                  canvasProps={{
                    width: 560,
                    height: 200,
                    className: 'w-full rounded-lg',
                  }}
                />
                <p className="absolute bottom-2 left-4 text-xs text-muted-foreground">
                  Draw your signature above
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Type your name</Label>
                <Input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter your full name"
                  className="text-lg"
                />
                {typedName && (
                  <div className="border rounded-lg p-4 bg-white">
                    <p className="text-3xl italic font-serif text-gray-800">{typedName}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={clearSignature}>
                <RotateCcw className="w-3 h-3 mr-1" /> Clear
              </Button>
              <Button
                onClick={handleSign}
                disabled={signMutation.isPending}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                {signMutation.isPending ? 'Signing...' : 'Sign Document'}
              </Button>
            </div>

            {signMutation.error && (
              <p className="text-sm text-red-500">{signMutation.error.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Decline */}
        <Card>
          <CardContent className="p-4">
            {!showDecline ? (
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-700"
                onClick={() => setShowDecline(true)}
              >
                Decline to Sign
              </Button>
            ) : (
              <div className="space-y-3">
                <Label>Reason for declining (optional)</Label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Explain why you are declining..."
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDecline(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDecline}
                    disabled={declineMutation.isPending}
                  >
                    {declineMutation.isPending ? 'Declining...' : 'Confirm Decline'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
