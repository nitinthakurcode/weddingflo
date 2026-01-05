'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
}

export function AvatarUpload({ userId, currentAvatarUrl }: AvatarUploadProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || user?.image);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const { toast } = useToast();

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.getCurrent.invalidate();
    },
  });

  // Get presigned upload URL
  const getUploadUrl = trpc.storage.getUploadUrl.useMutation();

  // Sync with session user image
  useEffect(() => {
    if (user?.image) {
      setAvatarUrl(user.image);
    }
  }, [user?.image]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
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
      // Generate file name
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;

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

      // The public URL pattern for R2 (adjust based on your R2 configuration)
      // For now, we'll use the key as a reference - the actual URL depends on R2 setup
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''}/${key}`;

      // Update user in database with avatar URL (user ID from session)
      await updateUser.mutateAsync({
        avatar_url: publicUrl,
      });

      setAvatarUrl(publicUrl);

      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated successfully.',
      });
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
      // Update database to remove avatar (user ID from session)
      await updateUser.mutateAsync({
        avatar_url: '',
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

  // Get initials from user name
  const nameParts = user?.name?.split(' ') || [];
  const initials = nameParts.length >= 2
    ? `${nameParts[0]?.[0] || ''}${nameParts[1]?.[0] || ''}`.toUpperCase()
    : (user?.name?.[0] || 'U').toUpperCase();

  return (
    <div className="flex items-center gap-6">
      <Avatar className="h-32 w-32 border-2">
        <AvatarImage src={avatarUrl || undefined} alt="Profile picture" />
        <AvatarFallback className="text-3xl bg-primary/10">
          {initials}
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
