'use client';

import { useState, useRef } from 'react';
import NextImage from 'next/image';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';

interface LogoUploadProps {
  currentLogoUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
  label?: string;
  description?: string;
}

export function LogoUpload({
  currentLogoUrl,
  onUploadComplete,
  onRemove,
  label = 'Logo',
  description = 'JPG, PNG or SVG. Max 5MB. Recommended: 400x400px'
}: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.companies.generateUploadUrl);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error('Upload failed');
      }

      const { storageId } = await result.json();

      // Step 3: Get the public URL for the uploaded file
      // Convex provides a URL in the format: https://[deployment-url]/api/storage/[storageId]
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        throw new Error('Convex URL not configured');
      }

      const logoUrl = `${convexUrl}/api/storage/${storageId}`;

      // Step 4: Update local state and notify parent
      setLogoUrl(logoUrl);
      onUploadComplete(logoUrl);

      toast({
        title: 'Upload successful',
        description: `${label} has been uploaded successfully.`,
      });
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast({
        title: 'Upload failed',
        description: `Failed to upload ${label.toLowerCase()}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setLogoUrl(undefined);
    onRemove();

    toast({
      title: `${label} removed`,
      description: `${label} has been removed.`,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{label}</h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="flex items-center gap-4">
        {logoUrl ? (
          <div className="relative h-24 w-24 rounded-md border border-input bg-background overflow-hidden">
            <NextImage
              src={logoUrl}
              alt={label}
              fill
              className="object-contain p-2"
              sizes="96px"
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-input bg-muted/20">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {logoUrl ? 'Change' : 'Upload'}
              </>
            )}
          </Button>

          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
