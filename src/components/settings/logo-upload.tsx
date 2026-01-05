'use client';

import { useState, useRef, useEffect } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

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
  const { toast } = useToast();

  // Get presigned upload URL from storage router
  const getUploadUrl = trpc.storage.getUploadUrl.useMutation();

  // Sync with prop changes
  useEffect(() => {
    setLogoUrl(currentLogoUrl);
  }, [currentLogoUrl]);

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
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Get presigned upload URL from tRPC
      const { uploadUrl, key } = await getUploadUrl.mutateAsync({
        fileName,
        fileType: file.type,
        fileSize: file.size,
        category: 'images',
      });

      // Upload file directly to R2 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Construct public URL (adjust based on R2 configuration)
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''}/${key}`;

      // Update local state and notify parent
      setLogoUrl(publicUrl);
      onUploadComplete(publicUrl);

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
