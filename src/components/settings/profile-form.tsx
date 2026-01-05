'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

interface User {
  id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
}

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  // Parse name into first/last, or use existing fields
  const initialFirstName = user.firstName || user.name?.split(' ')[0] || '';
  const initialLastName = user.lastName || user.name?.split(' ').slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();
  const { toast } = useToast();
  const router = useRouter();

  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.getCurrent.invalidate();
    },
  });

  const hasChanges = firstName !== initialFirstName || lastName !== initialLastName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // User ID comes from session context - just pass profile fields
      await updateUser.mutateAsync({
        first_name: firstName,
        last_name: lastName,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter your last name"
          />
        </div>
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

      <Button type="submit" disabled={isLoading || !hasChanges}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </form>
  );
}
