# Clerk Webhook Setup Guide

This guide will help you set up Clerk webhooks to automatically create user accounts in Convex when users sign up.

## What This Does

When a user signs up with Clerk, the webhook will automatically:
1. Create a **Company** record for the user
2. Create a **User** record linked to that company
3. Create a **Sample Client** record for testing the guest and hotel features

## Setup Steps

### 1. Expose Your Local Server (Development)

Since webhooks need a publicly accessible URL, you need to expose your local server using a tunneling service like **ngrok** or **Cloudflare Tunnel**.

#### Option A: Using ngrok (Recommended for Quick Setup)

```bash
# Install ngrok if you haven't already
# Download from: https://ngrok.com/download

# Expose your local port 3002
ngrok http 3002
```

You'll see output like:
```
Forwarding  https://abcd-1234-5678.ngrok-free.app -> http://localhost:3002
```

**Copy the HTTPS URL** (e.g., `https://abcd-1234-5678.ngrok-free.app`)

#### Option B: Using Cloudflare Tunnel

```bash
# Install cloudflared
brew install cloudflared  # macOS
# or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Create tunnel
cloudflared tunnel --url http://localhost:3002
```

### 2. Configure Webhook in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Webhooks** in the left sidebar
4. Click **+ Add Endpoint**

5. Configure the webhook:
   - **Endpoint URL**: `https://your-ngrok-url.ngrok-free.app/api/webhooks/clerk`
     - Replace `your-ngrok-url.ngrok-free.app` with your actual ngrok/tunnel URL
     - Keep the `/api/webhooks/clerk` path

   - **Subscribe to events**: Check these events:
     - ✅ `user.created` (Required)
     - ✅ `user.updated` (Optional but recommended)
     - ✅ `user.deleted` (Optional)

6. Click **Create**

### 3. Get the Webhook Signing Secret

After creating the webhook:

1. In the webhook details page, you'll see a **Signing Secret**
2. Click **Reveal** to see the secret
3. Copy the secret (it looks like `whsec_xxxxxxxxxxxxxx`)

### 4. Add Secret to Environment Variables

1. Open `.env.local` in your project
2. Find the line: `CLERK_WEBHOOK_SECRET=`
3. Paste your signing secret:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_your_actual_secret_here
   ```

### 5. Restart Your Development Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Testing the Webhook

### 1. Create a Test User

1. Open http://localhost:3002
2. Click **Sign Up**
3. Create a new account

### 2. Verify Webhook Execution

Check your terminal for the webhook logs:
```
✅ User onboarded: {
  userId: 'xxxxx',
  companyId: 'xxxxx',
  clientId: 'xxxxx',
  email: 'user@example.com'
}
```

### 3. Check Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Select your project
3. Check the **Data** tab
4. You should see new records in:
   - `companies` table
   - `users` table
   - `clients` table

### 4. Test the Guest and Hotel Pages

1. Navigate to http://localhost:3002/guests
2. Navigate to http://localhost:3002/hotels
3. Both pages should now load successfully with the sample client data

## Troubleshooting

### Webhook Not Firing

1. **Check ngrok is running**: Make sure your ngrok/tunnel is still active
2. **Check webhook URL**: Verify the URL in Clerk dashboard matches your ngrok URL
3. **Check logs**: Look at your terminal for any error messages
4. **Test webhook**: In Clerk dashboard, click "Send test event" on your webhook

### 500 Error from Webhook

1. **Check signing secret**: Make sure `CLERK_WEBHOOK_SECRET` is correctly set in `.env.local`
2. **Restart server**: Restart your Next.js dev server after adding the secret
3. **Check Convex connection**: Ensure `NEXT_PUBLIC_CONVEX_URL` is correct

### User Not Created in Database

1. **Check Convex logs**: Go to Convex dashboard > Logs
2. **Check webhook payload**: In Clerk dashboard, view the webhook attempt logs
3. **Verify user doesn't exist**: The webhook skips if user already exists

## Production Deployment

When deploying to production (e.g., Vercel):

1. Your webhook URL will be: `https://your-domain.com/api/webhooks/clerk`
2. Update the webhook endpoint URL in Clerk dashboard
3. Make sure `CLERK_WEBHOOK_SECRET` is set in your production environment variables

## What Gets Created

When a new user signs up, the webhook creates:

### Company
- Name: `{User Name}'s Company`
- Subscription: Free tier
- Max users: 5
- Max clients: 10

### User
- Role: `company_admin`
- Linked to the company
- Profile info from Clerk

### Sample Client
- Name: "Sample Wedding"
- Wedding date: 6 months from signup
- Planning stage: Early planning
- Includes AI recommendations to get started

## Need Help?

If you encounter issues:
1. Check the terminal logs for error messages
2. Check Clerk dashboard webhook logs
3. Check Convex dashboard logs
4. Verify all environment variables are set correctly
