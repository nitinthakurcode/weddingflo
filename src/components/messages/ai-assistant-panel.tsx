'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Send, Loader2, X } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';

interface AIAssistantPanelProps {
  clientId: Id<'clients'>;
  companyId: Id<'companies'>;
  onClose: () => void;
}

export function AIAssistantPanel({ clientId, companyId, onClose }: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // In a real implementation, this would call an AI API
  const handleGenerateResponse = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      // Simulate AI generation delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock AI suggestions based on prompt
      const mockSuggestions = [
        'Thank you for reaching out! I\'d be happy to help you with your wedding planning.',
        'I can assist you with vendor recommendations, budget management, and timeline planning.',
        'Let me know if you have any specific questions about your upcoming events.',
      ];

      setSuggestions(mockSuggestions);
    } finally {
      setIsGenerating(false);
    }
  };

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

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Suggestions</CardTitle>
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
