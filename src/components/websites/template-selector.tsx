'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WEDDING_TEMPLATES, type WeddingTemplate } from '@/lib/templates/wedding-templates';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  websiteId: string;
  currentTemplateId: string;
  onTemplateChange: () => void;
}

/**
 * Template Selector Component
 * Session 49: Choose from 5 beautiful templates
 */
export function TemplateSelector({
  websiteId,
  currentTemplateId,
  onTemplateChange,
}: TemplateSelectorProps) {
  const updateTemplate = trpc.websites.update.useMutation({
    onSuccess: () => {
      toast.success('Template changed!');
      onTemplateChange();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSelectTemplate = (templateId: string) => {
    if (templateId === currentTemplateId) return;

    updateTemplate.mutate({
      websiteId,
      data: {
        template_id: templateId,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Template</CardTitle>
        <CardDescription>
          Select a design that matches your wedding style
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WEDDING_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={template.id === currentTemplateId}
              onSelect={() => handleSelectTemplate(template.id)}
              isPending={updateTemplate.isPending}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  isPending,
}: {
  template: WeddingTemplate;
  isSelected: boolean;
  onSelect: () => void;
  isPending: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-primary shadow-lg'
          : 'border-border hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="rounded-full bg-primary p-1">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Template Preview */}
        <div
          className="h-32 rounded-md"
          style={{
            background: `linear-gradient(135deg, ${template.theme_colors.primary} 0%, ${template.theme_colors.secondary} 100%)`,
          }}
        />

        {/* Template Info */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold">{template.name}</h4>
            {template.premium && (
              <Badge variant="secondary" className="text-xs">
                Premium
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </div>

        {/* Color Palette */}
        <div className="flex gap-2">
          <div
            className="w-6 h-6 rounded-full border"
            style={{ backgroundColor: template.theme_colors.primary }}
            title="Primary"
          />
          <div
            className="w-6 h-6 rounded-full border"
            style={{ backgroundColor: template.theme_colors.secondary }}
            title="Secondary"
          />
          <div
            className="w-6 h-6 rounded-full border"
            style={{ backgroundColor: template.theme_colors.accent }}
            title="Accent"
          />
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1">
          {template.features.slice(0, 2).map((feature, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
          {template.features.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{template.features.length - 2}
            </Badge>
          )}
        </div>

        {!isSelected && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isPending}
          >
            Select Template
          </Button>
        )}
      </div>
    </div>
  );
}
