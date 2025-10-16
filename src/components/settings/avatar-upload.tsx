'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';

interface AvatarUploadProps {
  userId: Id<'users'>;
  currentAvatarUrl?: string;
}

export function AvatarUpload({ userId, currentAvatarUrl }: AvatarUploadProps) {
  const { user: clerkUser } = useUser();
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || clerkUser?.imageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateUser = useMutation(api.users.update);
  const { toast } = useToast();

  // Sync with Clerk user image
  useEffect(() => {
    if (clerkUser?.imageUrl) {
      setAvatarUrl(clerkUser.imageUrl);
    }
  }, [clerkUser?.imageUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB for Clerk)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 10MB.',
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
      // Update Clerk avatar
      await clerkUser?.setProfileImage({ file });

      // Wait a bit for Clerk to process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Reload user to get new image URL
      await clerkUser?.reload();

      const newAvatarUrl = clerkUser?.imageUrl;

      if (newAvatarUrl) {
        // Update Convex
        await updateUser({
          userId,
          avatar_url: newAvatarUrl,
        });

        setAvatarUrl(newAvatarUrl);

        toast({
          title: 'Avatar updated',
          description: 'Your profile picture has been updated successfully.',
        });
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);

    try {
      // Remove from Clerk
      await clerkUser?.setProfileImage({ file: null });

      // Update Convex
      await updateUser({
        userId,
        avatar_url: undefined,
      });

      setAvatarUrl(undefined);

      toast({
        title: 'Avatar removed',
        description: 'Your profile picture has been removed.',
      });
    } catch (error) {
      console.error('Failed to remove avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      <Avatar className="h-32 w-32 border-2">
        <AvatarImage src={avatarUrl} alt="Profile picture" />
        <AvatarFallback className="text-3xl bg-primary/10">
          {clerkUser?.firstName?.[0]?.toUpperCase() || 'U'}
          {clerkUser?.lastName?.[0]?.toUpperCase() || ''}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-3">
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
              {avatarUrl ? 'Change Image' : 'Upload Image'}
            </>
          )}
        </Button>

        {avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={isUploading}
          >
            <X className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}

        <p className="text-xs text-muted-foreground max-w-xs">
          JPG, PNG or GIF. Max 10MB. Square images work best.
        </p>
      </div>
    </div>
  );
}
