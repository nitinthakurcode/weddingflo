'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { EmailType, GeneratedEmail } from '@/lib/ai/email-generator';

interface AIEmailComposerProps {
  onEmailGenerated?: (email: GeneratedEmail) => void;
}

export function AIEmailComposer({ onEmailGenerated }: AIEmailComposerProps) {
  const [loading, setLoading] = useState(false);
  const [emailType, setEmailType] = useState<EmailType>('invitation');
  const [recipientName, setRecipientName] = useState('');
  const [recipientType, setRecipientType] = useState<'guest' | 'vendor' | 'group'>('guest');
  const [tone, setTone] = useState<'formal' | 'casual' | 'friendly' | 'professional'>('friendly');
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/email-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          recipientName: recipientName || undefined,
          recipientType,
          tone,
          customInstructions: customInstructions || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate email');
      }

      const result = await response.json();
      setGeneratedEmail(result);
      onEmailGenerated?.(result);
      toast({
        title: 'Email generated!',
        description: 'AI has created your email. You can edit it before sending.',
      });
    } catch (error) {
      console.error('Email generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'subject' | 'body') => {
    navigator.clipboard.writeText(text);
    if (type === 'subject') {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
    toast({
      title: 'Copied!',
      description: `${type === 'subject' ? 'Subject' : 'Email body'} copied to clipboard.`,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Email Generator</CardTitle>
          <CardDescription>
            Generate professional wedding emails with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email Type</Label>
              <Select value={emailType} onValueChange={(v) => setEmailType(v as EmailType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invitation">Invitation</SelectItem>
                  <SelectItem value="save_the_date">Save the Date</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="thank_you">Thank You</SelectItem>
                  <SelectItem value="vendor_inquiry">Vendor Inquiry</SelectItem>
                  <SelectItem value="vendor_confirmation">Vendor Confirmation</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient Type</Label>
              <Select value={recipientType} onValueChange={(v) => setRecipientType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guest">Guest</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recipient Name (Optional)</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Instructions (Optional)</Label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Add any specific details or requirements..."
              rows={3}
            />
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedEmail && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Email</CardTitle>
            <CardDescription>Review and edit before sending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Subject</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedEmail.subject, 'subject')}
                >
                  {copiedSubject ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Input value={generatedEmail.subject} readOnly className="font-medium" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Body</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedEmail.body, 'body')}
                >
                  {copiedBody ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Textarea
                value={generatedEmail.body}
                readOnly
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            {generatedEmail.suggestions.length > 0 && (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {generatedEmail.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
