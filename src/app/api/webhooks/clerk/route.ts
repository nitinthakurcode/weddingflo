import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
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
    console.error('Error verifying webhook:', err);
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

    try {
      const supabase = createServerSupabaseAdminClient();

      // Create user in Supabase
      const { error: userError } = await supabase.from('users').insert({
        clerk_id: id,
        email: email_addresses[0]?.email_address || '',
        first_name: first_name || null,
        last_name: last_name || null,
        avatar_url: image_url || null,
        role: 'planner',
      });

      if (userError) {
        console.error('Error creating user:', userError);
        return new Response('Error creating user in database', { status: 500 });
      }

      console.log('✅ User onboarded successfully:', id);
      return new Response('User created', { status: 200 });
    } catch (error) {
      console.error('Error onboarding user:', error);
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

      // Update user in Supabase
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: first_name || null,
          last_name: last_name || null,
          avatar_url: image_url || null,
        })
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

    try {
      // In production, you might want to soft-delete or archive instead
      console.log('⚠️  User deletion requested for:', id);

      // Uncomment to enable hard delete:
      // const supabase = createServerSupabaseAdminClient();
      // await supabase.from('users').delete().eq('clerk_id', id);

      return new Response('User deletion handled', { status: 200 });
    } catch (error) {
      console.error('Error deleting user:', error);
      return new Response('Error deleting user from database', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
}
