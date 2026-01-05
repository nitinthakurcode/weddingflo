'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Brain, Loader2, Save } from 'lucide-react';

export default function AIConfigPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const companyId = (session?.user as any)?.companyId as string | undefined;

  const [aiConfig, setAiConfig] = useState({
    enabled: true,
    seating_ai_enabled: true,
    budget_predictions_enabled: true,
    auto_timeline_enabled: true,
    email_assistant_enabled: true,
    voice_assistant_enabled: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch company data using tRPC
  const { data: company, isLoading } = trpc.companies.getCurrent.useQuery(
    undefined,
    { enabled: !!session?.user && !!companyId }
  );

  useEffect(() => {
    if (company?.settings) {
      const settings = company.settings as any;
      if (settings.ai_config) {
        setAiConfig(settings.ai_config);
      }
    }
  }, [company]);

  // Update AI config mutation using tRPC
  const updateAIConfigMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'AI Configuration updated',
        description: 'Your AI settings have been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to update AI config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI configuration. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) return;

    setIsSaving(true);

    try {
      const currentSettings = (company?.settings as any) || {};
      await updateAIConfigMutation.mutateAsync({
        settings: {
          ...currentSettings,
          ai_config: aiConfig,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Company not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-mocha-900 to-mocha-600 dark:from-mocha-100 dark:to-mocha-300 bg-clip-text text-transparent">
          AI Configuration
        </h1>
        <p className="text-muted-foreground">
          Configure AI features and capabilities
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card
          variant="glass"
          className="border border-teal-200/50 dark:border-teal-800/30 shadow-lg shadow-teal-500/10 bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-mocha-900 dark:via-teal-950/10 dark:to-mocha-900"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30">
                <Brain className="h-4 w-4 text-white" />
              </div>
              AI Features
            </CardTitle>
            <CardDescription>
              Enable or disable AI-powered features for your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-enabled">Enable AI Features</Label>
                <p className="text-sm text-muted-foreground">
                  Master switch for all AI capabilities
                </p>
              </div>
              <Switch
                id="ai-enabled"
                checked={aiConfig.enabled}
                onCheckedChange={(checked) =>
                  setAiConfig({ ...aiConfig, enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="seating-ai">Smart Seating Arrangements</Label>
                <p className="text-sm text-muted-foreground">
                  AI-powered guest seating suggestions
                </p>
              </div>
              <Switch
                id="seating-ai"
                checked={aiConfig.seating_ai_enabled}
                onCheckedChange={(checked) =>
                  setAiConfig({ ...aiConfig, seating_ai_enabled: checked })
                }
                disabled={!aiConfig.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budget-predictions">Budget Predictions</Label>
                <p className="text-sm text-muted-foreground">
                  AI-powered budget forecasting and insights
                </p>
              </div>
              <Switch
                id="budget-predictions"
                checked={aiConfig.budget_predictions_enabled}
                onCheckedChange={(checked) =>
                  setAiConfig({ ...aiConfig, budget_predictions_enabled: checked })
                }
                disabled={!aiConfig.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-timeline">Auto Timeline Optimization</Label>
                <p className="text-sm text-muted-foreground">
                  Automatic event scheduling and conflict resolution
                </p>
              </div>
              <Switch
                id="auto-timeline"
                checked={aiConfig.auto_timeline_enabled}
                onCheckedChange={(checked) =>
                  setAiConfig({ ...aiConfig, auto_timeline_enabled: checked })
                }
                disabled={!aiConfig.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-assistant">Email Assistant</Label>
                <p className="text-sm text-muted-foreground">
                  AI-powered email drafting and responses
                </p>
              </div>
              <Switch
                id="email-assistant"
                checked={aiConfig.email_assistant_enabled}
                onCheckedChange={(checked) =>
                  setAiConfig({ ...aiConfig, email_assistant_enabled: checked })
                }
                disabled={!aiConfig.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="voice-assistant">Voice Assistant</Label>
                <p className="text-sm text-muted-foreground">
                  Voice commands and interactions (experimental)
                </p>
              </div>
              <Switch
                id="voice-assistant"
                checked={aiConfig.voice_assistant_enabled}
                onCheckedChange={(checked) =>
                  setAiConfig({ ...aiConfig, voice_assistant_enabled: checked })
                }
                disabled={!aiConfig.enabled}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
