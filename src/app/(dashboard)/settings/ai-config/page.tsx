'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Brain, Loader2, Save } from 'lucide-react';
import type { Id } from '../../../../../convex/_generated/dataModel';

export default function AIConfigPage() {
  const company = useQuery(api.companies.getCurrentUserCompany);
  const updateAIConfig = useMutation(api.companies.updateAIConfig);
  const { toast } = useToast();

  const [aiConfig, setAiConfig] = useState({
    enabled: true,
    seating_ai_enabled: true,
    budget_predictions_enabled: true,
    auto_timeline_enabled: true,
    email_assistant_enabled: true,
    voice_assistant_enabled: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company?.ai_config) {
      setAiConfig(company.ai_config);
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company?._id) return;

    setIsSaving(true);

    try {
      await updateAIConfig({
        companyId: company._id as Id<'companies'>,
        ai_config: aiConfig,
      });

      toast({
        title: 'AI Configuration updated',
        description: 'Your AI settings have been saved successfully.',
      });
    } catch (error) {
      console.error('Failed to update AI config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI configuration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Configuration</h1>
        <p className="text-muted-foreground">
          Configure AI features and capabilities
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
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
