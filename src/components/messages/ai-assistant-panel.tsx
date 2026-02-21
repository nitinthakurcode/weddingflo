'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Send, Loader2, X, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

interface AIAssistantPanelProps {
  clientId: string;
  companyId: string;
  onClose: () => void;
}

export function AIAssistantPanel({ clientId, companyId, onClose }: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use the real AI email generation endpoint
  const generateEmail = trpc.ai.generateEmail.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        // data contains subject, body, suggestions
        const suggestions: string[] = [];
        if (result.data.subject) suggestions.push(result.data.subject);
        if (result.data.body) suggestions.push(result.data.body);
        if (result.data.suggestions) suggestions.push(...result.data.suggestions);
        setSuggestions(suggestions.filter(Boolean));
      }
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to generate response');
      setSuggestions([]);
    },
  });

  const handleGenerateResponse = async () => {
    if (!prompt.trim()) return;
    setError(null);

    // Use the AI email generation for message suggestions
    generateEmail.mutate({
      emailType: 'custom',
      tone: 'friendly',
      customInstructions: prompt,
    });
  };

  const isGenerating = generateEmail.isPending;

  const handleUseSuggestion = (suggestion: string) => {
    // This would integrate with the message input
    // For now, we'll just show it in the suggestions
    alert(`Using suggestion: ${suggestion}`);
  };

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => setPrompt('Generate a friendly greeting for a new client')}
            >
              Generate Greeting
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => setPrompt('Suggest next steps for wedding planning')}
            >
              Suggest Next Steps
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => setPrompt('Create a budget reminder message')}
            >
              Budget Reminder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => setPrompt('Draft a vendor follow-up message')}
            >
              Vendor Follow-up
            </Button>
          </CardContent>
        </Card>

        {/* Custom Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Custom Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask AI to help with a message..."
              className="min-h-[100px]"
            />
            <Button
              onClick={handleGenerateResponse}
              disabled={!prompt.trim() || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-destructive font-medium">Unable to generate</p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI Generated</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2"
                >
                  <p className="text-sm">{suggestion}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUseSuggestion(suggestion)}
                  >
                    <Send className="h-3 w-3 mr-2" />
                    Use This
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm text-blue-900">💡 Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Be specific in your requests</li>
              <li>• AI can help draft responses to client questions</li>
              <li>• Use quick actions for common scenarios</li>
              <li>• Review and edit AI suggestions before sending</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
