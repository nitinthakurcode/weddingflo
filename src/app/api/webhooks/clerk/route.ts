// @ts-nocheck
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
import { UserRole, TablesInsert, TablesUpdate, SubscriptionTier, SubscriptionStatus } from '@/lib/supabase/types';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing svix headers:', {
      svix_id: !!svix_id,
      svix_timestamp: !!svix_timestamp,
      svix_signature: !!svix_signature,
    });
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ Error verifying webhook signature:', err);
    console.error('Webhook secret configured:', !!process.env.CLERK_WEBHOOK_SECRET);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    if (!id) {
      return new Response('Missing user ID', { status: 400 });
    }

    const email = email_addresses[0]?.email_address || '';

    // Handle test events from Clerk dashboard (they don't have real emails)
    if (!email) {
      console.log('⚠️  Test event detected (no email) - returning success without creating user');
      return new Response('Test event handled', { status: 200 });
    }

    try {
      const supabase = createServerSupabaseAdminClient();

      // Determine role based on super admin email
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
      const isSuperAdmin = email === superAdminEmail;
      const role = isSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.COMPANY_ADMIN;

      console.log(`🔐 Assigning role "${role}" to user ${email}`);

      // Determine company assignment
      let companyId: string | null = null;

      if (isSuperAdmin) {
        // Find or create platform company for super admin
        console.log('[Webhook] Super admin detected, looking for platform company...');

        const { data: platformCompany, error: companyFetchError } = await supabase
          .from('companies')
          .select('*')
          .eq('subdomain', 'platform')
          .single();

        if (companyFetchError && companyFetchError.code !== 'PGRST116') {
          console.error('❌ [Webhook] Error fetching platform company:', companyFetchError);
        }

        if (platformCompany) {
          companyId = platformCompany.id || platformCompany.uuid || (platformCompany as any).company_id || null;
          console.log(`✅ [Webhook] Found existing platform company: ${companyId}`);
        } else {
          // Create platform company if it doesn't exist
          console.log('[Webhook] Platform company not found, creating...');

          const companyInsert: TablesInsert<'companies'> = {
            name: 'WeddingFlow Platform',
            subdomain: 'platform',
            subscription_tier: SubscriptionTier.ENTERPRISE,
            subscription_status: SubscriptionStatus.ACTIVE,
            logo_url: null,
            branding: null,
            settings: null,
            stripe_customer_id: null,
            stripe_subscription_id: null,
            trial_ends_at: null,
            subscription_ends_at: null,
          };

          const { data: newCompany, error: createCompanyError } = await supabase
            .from('companies')
            .insert(companyInsert)
            .select('*')
            .single();

          if (createCompanyError) {
            console.error('❌ [Webhook] Error creating platform company:', createCompanyError);
            console.error('❌ [Webhook] Error details:', JSON.stringify(createCompanyError, null, 2));
          } else if (newCompany) {
            console.log('✅ [Webhook] Platform company created, response:', JSON.stringify(newCompany, null, 2));
            companyId = newCompany.id || newCompany.uuid || (newCompany as any).company_id || null;
            console.log(`✅ [Webhook] Platform company ID: ${companyId}`);
          }
        }
      } else {
        // For company admins, create a new company - THIS IS REQUIRED
        const companyName = `${first_name || 'User'}'s Company`;
        // Generate subdomain from user ID - remove underscores and use only alphanumeric
        const subdomain = `company${id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()}`;

        console.log(`[Webhook] Creating company: ${companyName} (subdomain: ${subdomain})`);

        const companyInsert: TablesInsert<'companies'> = {
          name: companyName,
          subdomain,
          subscription_tier: SubscriptionTier.FREE,
          subscription_status: SubscriptionStatus.TRIALING,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          logo_url: null,
          branding: null,
          settings: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_ends_at: null,
        };

        const { data: newCompany, error: createCompanyError } = await supabase
          .from('companies')
          .insert(companyInsert)
          .select('*')  // Select all columns to see full response
          .single();

        // Company creation MUST succeed for regular users
        if (createCompanyError) {
          console.error('❌ [Webhook] CRITICAL: Failed to create company for user!');
          console.error('❌ [Webhook] Error:', createCompanyError);
          console.error('❌ [Webhook] Error details:', JSON.stringify(createCompanyError, null, 2));
          // FAIL the webhook - user cannot be created without a company
          return new Response('Failed to create company for user', { status: 500 });
        }

        if (!newCompany) {
          console.error('❌ [Webhook] CRITICAL: Company creation returned no data!');
          return new Response('Company creation returned no data', { status: 500 });
        }

        console.log('✅ [Webhook] Company created, full response:', JSON.stringify(newCompany, null, 2));

        // Extract company ID - try multiple possible field names
        companyId = newCompany.id || newCompany.uuid || (newCompany as any).company_id || null;

        if (!companyId) {
          console.error('❌ [Webhook] CRITICAL: Company created but ID is missing!');
          console.error('❌ [Webhook] Response keys:', Object.keys(newCompany));
          return new Response('Company ID not found in response', { status: 500 });
        }

        console.log(`✅ [Webhook] Company ID extracted successfully: ${companyId}`);
      }

      // VALIDATION: Ensure company_id is set before creating user
      if (!companyId) {
        console.error('❌ [Webhook] CRITICAL: Attempting to create user without company_id!');
        console.error('❌ [Webhook] Role:', role, 'isSuperAdmin:', isSuperAdmin);
        return new Response('Cannot create user without company_id', { status: 500 });
      }

      // Create user in Supabase with GUARANTEED company_id
      console.log(`[Webhook] ✓ Validation passed - company_id is set: ${companyId}`);
      console.log(`[Webhook] Creating user with company_id: ${companyId} (type: ${typeof companyId})`);

      const userInsert: TablesInsert<'users'> = {
        clerk_id: id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        avatar_url: image_url || null,
        role,
        company_id: companyId,  // GUARANTEED to be non-null here
        is_active: true,
      };

      const { error: userError } = await supabase.from('users').insert(userInsert);

      if (userError) {
        console.error('❌ [Webhook] Error creating user in Supabase:', userError);
        console.error('❌ [Webhook] User error details:', JSON.stringify(userError, null, 2));
        return new Response('Error creating user in database', { status: 500 });
      }

      console.log(`✅ [Webhook] User created successfully with company_id: ${companyId}`);

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
        // Don't fail the entire operation if metadata update fails
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
      const email = email_addresses[0]?.email_address || '';

      // Update user in Supabase (do NOT update role - only set on creation)
      const userUpdate: TablesUpdate<'users'> = {
        email: email || undefined,
        first_name: first_name || null,
        last_name: last_name || null,
        avatar_url: image_url || null,
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(userUpdate)
        .eq('clerk_id', id);

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        return new Response('Error updating user in database', { status: 500 });
      }

      console.log('✅ User updated successfully:', { id, email });
      return new Response('User updated', { status: 200 });
    } catch (error) {
      console.error('❌ Error updating user:', error);
      return new Response('Error updating user in database', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    if (!id) {
      return new Response('Missing user ID', { status: 400 });
    }

    try {
      const supabase = createServerSupabaseAdminClient();

      console.log('🗑️  Deleting user:', id);

      // Delete user from Supabase (will cascade delete related data if foreign keys configured)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('clerk_id', id);

      if (deleteError) {
        console.error('❌ Error deleting user:', deleteError);
        return new Response('Error deleting user from database', { status: 500 });
      }

      console.log('✅ User deleted successfully:', id);
      return new Response('User deleted', { status: 200 });
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      return new Response('Error deleting user from database', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
}
