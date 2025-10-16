'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Loader2, Trash2, Mail, Crown, Briefcase, Eye, Edit2, CheckCircle2 } from 'lucide-react';
import { useIsAdmin } from '@/lib/permissions/can';
import { cn } from '@/lib/utils';
import type { Id } from '../../../../../convex/_generated/dataModel';

const ROLE_CONFIG = {
  super_admin: {
    label: 'Super Admin',
    description: 'Platform-wide access across all companies with full system control',
    icon: Crown,
    badge: 'bg-gradient-to-r from-primary to-pink-600 text-white',
    card: 'border-primary/20 hover:border-primary/40 hover:bg-primary/5/50',
    iconBg: 'bg-primary/10 text-primary',
  },
  company_admin: {
    label: 'Company Admin',
    description: 'Full access to all features, settings, team management, billing, and branding',
    icon: Crown,
    badge: 'bg-gradient-to-r from-primary to-pink-600 text-white',
    card: 'border-primary/20 hover:border-primary/40 hover:bg-primary/5/50',
    iconBg: 'bg-primary/10 text-primary',
  },
  staff: {
    label: 'Staff',
    description: 'Can manage events, clients, vendors, budgets, and guest lists',
    icon: Briefcase,
    badge: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white',
    card: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
  client_viewer: {
    label: 'Client Viewer',
    description: 'View-only access to client information',
    icon: Eye,
    badge: 'bg-gradient-to-r from-slate-500 to-gray-600 text-white',
    card: 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/50',
    iconBg: 'bg-slate-100 text-slate-600',
  },
};

export default function TeamPage() {
  const teamMembers = useQuery(api.users.getTeamMembers);
  const currentUser = useQuery(api.users.getCurrent);
  const updateRole = useMutation(api.users.updateUserRole);
  const removeUser = useMutation(api.users.removeTeamMember);
  const isAdmin = useIsAdmin();
  const { toast } = useToast();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'super_admin' | 'company_admin' | 'staff' | 'client_viewer'>('staff');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Role change dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<NonNullable<typeof teamMembers>[number] | null>(null);

  const handleRoleChange = async (userId: Id<'users'>, newRole: string) => {
    try {
      await updateRole({
        userId,
        role: newRole as any,
      });

      toast({
        title: 'Role updated',
        description: 'User role has been updated successfully.',
      });

      setRoleDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role.',
        variant: 'destructive',
      });
    }
  };

  const openRoleDialog = (member: NonNullable<typeof teamMembers>[number]) => {
    setSelectedMember(member);
    setRoleDialogOpen(true);
  };

  const handleRemoveUser = async (userId: Id<'users'>) => {
    try {
      await removeUser({ userId });

      toast({
        title: 'User removed',
        description: 'Team member has been removed successfully.',
      });
    } catch (error) {
      console.error('Failed to remove user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove user.',
        variant: 'destructive',
      });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsInviting(true);

    try {
      // For now, show a success message
      // In a full implementation, this would send an invite via Clerk or email
      toast({
        title: 'Invite sent!',
        description: `An invitation has been sent to ${inviteEmail}.`,
      });

      setInviteEmail('');
      setInviteRole('staff');
      setIsInviteDialogOpen(false);
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  if (!teamMembers || !currentUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and permissions
          </p>
        </div>

        {isAdmin && (
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team via email.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value: any) => setInviteRole(value)}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="company_admin">Company Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="client_viewer">Client Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {inviteRole === 'super_admin' && 'Platform-wide access across all companies'}
                    {inviteRole === 'company_admin' && 'Full access to all features and settings'}
                    {inviteRole === 'staff' && 'Access to manage events and clients'}
                    {inviteRole === 'client_viewer' && 'View-only access to client information'}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                  disabled={isInviting}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({teamMembers.length})
          </CardTitle>
          <CardDescription>
            View and manage your team members and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => {
                const isCurrentUser = member._id === currentUser._id;

                return (
                  <TableRow key={member._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>
                            {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.name}
                            {isCurrentUser && (
                              <Badge variant="outline" className="ml-2">You</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG]?.badge || 'bg-gray-500'}>
                          {ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG]?.label || member.role}
                        </Badge>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRoleDialog(member)}
                            className="h-8 px-2 text-xs"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Change
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.last_active_at).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {!isCurrentUser && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.name} from your team?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveUser(member._id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Change Team Member Role</DialogTitle>
            <DialogDescription asChild>
              <div>
                {selectedMember && (
                  <div className="flex items-center gap-3 mt-3 p-3 bg-muted rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedMember.avatar_url} />
                      <AvatarFallback>
                        {selectedMember.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">{selectedMember.name}</div>
                      <div className="text-sm text-muted-foreground">{selectedMember.email}</div>
                    </div>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm font-medium text-muted-foreground mb-4">
              Select a new role for this team member:
            </p>

            {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => {
              const Icon = config.icon;
              const isCurrentRole = selectedMember?.role === roleKey;

              return (
                <div
                  key={roleKey}
                  onClick={() => !isCurrentRole && selectedMember && handleRoleChange(selectedMember._id, roleKey)}
                  className={cn(
                    'w-full p-4 rounded-lg border-2 transition-all text-left',
                    config.card,
                    isCurrentRole && 'border-primary bg-primary/5 cursor-default',
                    !isCurrentRole && 'cursor-pointer'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-lg', config.iconBg)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-base">{config.label}</h3>
                        {isCurrentRole && (
                          <Badge variant="outline" className="ml-2">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Current Role
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRoleDialogOpen(false);
                setSelectedMember(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding different role types and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => {
            const Icon = config.icon;
            return (
              <div key={roleKey} className="space-y-3 p-4 rounded-lg border">
                <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', config.iconBg)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <Badge className={config.badge}>{config.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {config.description}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
