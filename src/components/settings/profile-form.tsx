'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { UserResource } from '@clerk/types';

interface User {
  id: string;
  name: string;
  email: string;
  [key: string]: any;
}

interface ProfileFormProps {
  user: User;
  clerkUser: UserResource;
}

export function ProfileForm({ user, clerkUser }: ProfileFormProps) {
  const [name, setName] = useState(user.name);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const updateUser = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!supabase) throw new Error('Supabase client not ready');
      const { data, error } = await supabase
        .from('users')
        // @ts-ignore - TODO: Regenerate Supabase types from database schema
        .update({ name })
        .eq('id', user.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', user.id] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Update in Supabase
      await updateUser.mutateAsync({ name });

      // Update in Clerk
      await clerkUser.update({
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || undefined,
      });

      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });

      router.refresh();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={user.email}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed. Contact support if you need to update your email.
        </p>
      </div>

      <Button type="submit" disabled={isLoading || name === user.name}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </form>
  );
}
