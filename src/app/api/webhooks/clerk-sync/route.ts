// @ts-nocheck
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
import { UserRole, TablesInsert, TablesUpdate, SubscriptionTier, SubscriptionStatus } from '@/lib/database.types';

export async function POST(req: Request) {
  console.log('🔔 Webhook received at /api/webhooks/clerk-sync');

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  console.log('📋 Headers:', {
    hasSvixId: !!svix_id,
    hasSvixTimestamp: !!svix_timestamp,
    hasSvixSignature: !!svix_signature,
  });

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing svix headers');
    return new Response('Error: Missing svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  console.log('📦 Event type:', payload.type);

  // Get webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ CLERK_WEBHOOK_SECRET not configured');
    return new Response('Error: Webhook secret not configured', {
      status: 500,
    });
  }

  console.log('🔑 Webhook secret configured:', webhookSecret.substring(0, 10) + '...');

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
    console.log('✅ Webhook signature verified');
  } catch (err) {
    console.error('❌ Error verifying webhook signature:', err);
    return new Response('Error: Invalid signature', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log('🎯 Processing event:', eventType);

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    if (!id) {
      console.error('❌ Missing user ID');
      return new Response('Missing user ID', { status: 400 });
    }

    const email = email_addresses[0]?.email_address || '';

    console.log('👤 User data:', { id, email, first_name, last_name });

    // Handle test events from Clerk (they don't have email addresses)
    if (!email) {
      console.log('⚠️  Test event detected (no email) - returning success without creating user');
      return new Response('Test event received - no email provided', { status: 200 });
    }

    try {
      const supabase = createServerSupabaseAdminClient();

      // Determine role based on super admin email
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
      const isSuperAdmin = email === superAdminEmail;
      const role: UserRole = isSuperAdmin ? 'super_admin' : 'company_admin';

      console.log(`🔐 Assigning role "${role}" to user ${email}`);

      // Determine company assignment
      let companyId: string | null = null;

      if (isSuperAdmin) {
        // Find or create platform company for super admin
        const { data: platformCompany, error: companyFetchError } = (await supabase
          .from('companies')
          .select('id')
          .eq('subdomain', 'platform')
          .single()) as { data: { id: string } | null; error: any };

        if (companyFetchError && companyFetchError.code !== 'PGRST116') {
          console.error('❌ Error fetching platform company:', companyFetchError);
        }

        if (platformCompany) {
          companyId = platformCompany.id;
          console.log('✅ Assigned to platform company:', companyId);
        } else {
          // Create platform company if it doesn't exist
          const companyInsert: TablesInsert<'companies'> = {
            name: 'WeddingFlow Platform',
            subdomain: 'platform',
            subscription_tier: 'enterprise' as SubscriptionTier,
            subscription_status: 'active' as SubscriptionStatus,
            logo_url: null,
            branding: null,
            settings: null,
            stripe_customer_id: null,
            stripe_subscription_id: null,
            trial_ends_at: null,
            subscription_ends_at: null,
          };

          const { data: newCompany, error: createCompanyError } = (await supabase
            .from('companies')
            .insert(companyInsert as any)
            .select('id')
            .single()) as { data: { id: string } | null; error: any };

          if (createCompanyError) {
            console.error('❌ Error creating platform company:', createCompanyError);
          } else if (newCompany) {
            companyId = newCompany.id;
            console.log('✅ Created platform company:', companyId);
          }
        }
      } else {
        // For company admins, create a new company
        const companyName = `${first_name || 'User'}'s Company`;
        const subdomain = `company-${id.slice(0, 8)}`;

        const companyInsert: TablesInsert<'companies'> = {
          name: companyName,
          subdomain,
          subscription_tier: 'free' as SubscriptionTier,
          subscription_status: 'trialing' as SubscriptionStatus,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          logo_url: null,
          branding: null,
          settings: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_ends_at: null,
        };

        const { data: newCompany, error: createCompanyError } = (await supabase
          .from('companies')
          .insert(companyInsert as any)
          .select('id')
          .single()) as { data: { id: string } | null; error: any };

        if (createCompanyError) {
          console.error('⚠️  Error creating company:', createCompanyError);
        } else if (newCompany) {
          companyId = newCompany.id;
          console.log('✅ Created company for user:', companyId);
        }
      }

      // Create user in Supabase
      const userInsert: TablesInsert<'users'> = {
        clerk_id: id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        avatar_url: image_url || null,
        role,
        company_id: companyId,
        is_active: true,
      };

      const { error: userError } = await supabase.from('users').insert(userInsert as any);

      if (userError) {
        console.error('❌ Error creating user in Supabase:', userError);
        return new Response('Error creating user in database', { status: 500 });
      }

      console.log('✅ User created in Supabase');

      // Update Clerk user metadata with the role
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(id, {
          publicMetadata: {
            role,
          },
        });
        console.log(`✅ Updated Clerk metadata with role: ${role}`);
      } catch (metadataError) {
        console.error('⚠️  Error updating Clerk metadata:', metadataError);
      }

      console.log('✅ User synced successfully:', { id, email, role });
      return new Response('User created', { status: 200 });
    } catch (error) {
      console.error('❌ Error onboarding user:', error);
      return new Response('Error creating user in database', { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    if (!id) {
      return new Response('Missing user ID', { status: 400 });
    }

    try {
      const supabase = createServerSupabaseAdminClient();

      const userUpdate: TablesUpdate<'users'> = {
        first_name: first_name || null,
        last_name: last_name || null,
        avatar_url: image_url || null,
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(userUpdate as any)
        .eq('clerk_id', id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return new Response('Error updating user in database', { status: 500 });
      }

      console.log('✅ User updated successfully:', id);
      return new Response('User updated', { status: 200 });
    } catch (error) {
      console.error('Error updating user:', error);
      return new Response('Error updating user in database', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    if (!id) {
      return new Response('Missing user ID', { status: 400 });
    }

    console.log('⚠️  User deletion requested for:', id);
    return new Response('User deletion handled', { status: 200 });
  }

  console.log('✅ Webhook processed successfully');
  return new Response('Webhook received', { status: 200 });
}
