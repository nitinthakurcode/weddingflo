# Resend Email Configuration Guide

## ✅ Current Status: CONFIGURED (Partially)

Your Resend configuration in `.env.local` is **mostly complete**. Here's what you have:

```bash
# === RESEND (Before Session 13) ===
RESEND_API_KEY=re_E9it29Rt_LMgWECijf5mvVURHifQG65xt
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_WEBHOOK_SECRET=  # ⚠️ Missing (optional but recommended)
```

---

## 🔑 IMPORTANT: Resend Does NOT Use Usernames!

### Authentication Method:
**Resend uses ONLY an API key** - there is **NO username or password**.

Unlike traditional email services (Gmail, Outlook), Resend is a developer-first API service that only requires:
1. ✅ **API Key** - Your authentication token (you have this!)
2. ✅ **From Email** - The sender email address (you have this!)
3. ⚠️ **Webhook Secret** - For webhook verification (optional, missing)

---

## 📋 What You Currently Have

### 1. RESEND_API_KEY ✅
```bash
RESEND_API_KEY=re_E9it29Rt_LMgWECijf5mvVURHifQG65xt
```

**Status:** ✅ CONFIGURED
**What it does:** Authenticates your app with Resend API
**Format:** Starts with `re_` followed by alphanumeric characters
**Where to get it:** https://resend.com/api-keys

### 2. RESEND_FROM_EMAIL ✅
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Status:** ✅ CONFIGURED (Test Mode)
**What it does:** The "From" address shown in emails
**Current:** Using Resend's test domain (no verification needed)
**For Production:** You'll need to verify your own domain

### 3. RESEND_WEBHOOK_SECRET ⚠️
```bash
RESEND_WEBHOOK_SECRET=
```

**Status:** ⚠️ NOT SET (Optional but recommended)
**What it does:** Verifies webhook signatures for email delivery tracking
**Required for:** Production email tracking (sent, delivered, bounced, opened, clicked events)

---

## 🎯 How Resend Works (No Username Needed!)

### Traditional Email (Gmail, Outlook):
```
❌ Username: your-email@gmail.com
❌ Password: your-password
❌ SMTP Server: smtp.gmail.com
❌ Port: 587
```

### Resend (API-Based):
```
✅ API Key: re_xxxxxxxxxxxxx (that's it!)
✅ From Email: your-email@yourdomain.com
✅ SDK: Resend(process.env.RESEND_API_KEY)
```

**That's why you can't find a username - Resend doesn't use one!** 🎉

---

## 🚀 How to Access Your Resend Account

Since Resend doesn't use username/password for the API, here's how to access your account:

### Step 1: Login to Resend Dashboard
Go to: https://resend.com/login

**Login Methods:**
- Email + Magic Link (passwordless)
- GitHub OAuth
- Google OAuth

You'll receive a login link via email or authenticate via GitHub/Google.

### Step 2: View Your API Keys
Once logged in:
1. Go to https://resend.com/api-keys
2. You'll see your existing API keys
3. The key in your `.env.local` should be listed there

### Step 3: Check Your Account Email
Your Resend account is associated with the **email address you used to sign up**.

**To find your account email:**
1. Login to https://resend.com
2. Click your profile icon (top right)
3. Go to "Settings"
4. Your account email is shown there

---

## 🔍 How to Verify Your Current Resend Setup

### Check if API Key is Valid

```bash
# Test your Resend API key
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_E9it29Rt_LMgWECijf5mvVURHifQG65xt" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<p>This is a test email from WeddingFlow Pro</p>"
  }'
```

**Expected Response (if valid):**
```json
{
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}
```

**Error Response (if invalid):**
```json
{
  "statusCode": 401,
  "message": "Invalid API key"
}
```

---

## 🛠️ How to Get Missing Information

### If You Don't Remember Your Resend Account:

#### Option 1: Check Email Inbox
Search your email for:
- **Subject:** "Welcome to Resend"
- **From:** team@resend.com
- **Subject:** "Verify your email"

This will show which email address you used to sign up.

#### Option 2: Try Common Emails
Try logging in with these emails (passwordless - just click the magic link):
- nitinthakurcode@gmail.com (your admin email from `.env.local`)
- Your other common email addresses

#### Option 3: Check Browser Saved Credentials
1. Open Chrome/Firefox
2. Settings → Passwords
3. Search for "resend.com"

#### Option 4: Create New Account (if needed)
If you can't access your old account:
1. Create a new Resend account at https://resend.com/signup
2. Generate a new API key
3. Update `RESEND_API_KEY` in `.env.local`

---

## 📧 Email Configuration Details

### Current Setup (Test Mode):

```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**What this means:**
- ✅ Works immediately (no domain verification)
- ✅ Good for development/testing
- ⚠️ Limited to 100 emails/day (Resend free tier)
- ⚠️ Cannot use for production (shows "via resend.dev" in email clients)

### Production Setup (Custom Domain):

To use your own domain (e.g., `hello@weddingflow.com`):

1. **Add Domain in Resend:**
   - Go to https://resend.com/domains
   - Click "Add Domain"
   - Enter your domain: `weddingflow.com`

2. **Add DNS Records:**
   Resend will give you DNS records to add to your domain registrar:
   ```
   Type: TXT
   Name: resend._domainkey
   Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ...

   Type: MX
   Name: @
   Value: feedback-smtp.us-east-1.amazonses.com
   ```

3. **Update .env.local:**
   ```bash
   RESEND_FROM_EMAIL=hello@weddingflow.com
   ```

4. **Verify Domain:**
   - Resend will automatically verify DNS records
   - Takes 5-10 minutes to propagate
   - Once verified, you can send from your domain

---

## 🔐 Security Best Practices

### 1. Keep API Key Secret
```bash
# ✅ GOOD - Stored in .env.local (gitignored)
RESEND_API_KEY=re_E9it29Rt_LMgWECijf5mvVURHifQG65xt

# ❌ BAD - Hardcoded in source code
const resend = new Resend('re_E9it29Rt_LMgWECijf5mvVURHifQG65xt')
```

### 2. Use Different Keys for Different Environments
```bash
# Development (.env.local)
RESEND_API_KEY=re_dev_xxxxxxxxxxxxx

# Production (Vercel/Railway environment variables)
RESEND_API_KEY=re_prod_xxxxxxxxxxxxx
```

### 3. Rotate Keys Regularly
- Create new API keys every 90 days
- Delete old keys after rotation
- Update environment variables

---

## 📊 Resend Pricing & Limits

### Free Tier (Current):
- ✅ 3,000 emails/month
- ✅ 100 emails/day
- ✅ 1 domain
- ✅ Email API access
- ✅ Webhooks
- ❌ No dedicated IPs

### Pro Tier ($20/month):
- ✅ 50,000 emails/month
- ✅ No daily limit
- ✅ 10 domains
- ✅ Email analytics
- ✅ Priority support

**Your current usage:** Likely within free tier for development

---

## 🎯 Next Steps

### Immediate (Development):
- [x] ✅ API key configured
- [x] ✅ From email configured (test mode)
- [ ] ⚠️ Test sending an email to verify setup
- [ ] ⚠️ Get webhook secret (optional)

### Before Production:
- [ ] Verify your custom domain (weddingflow.com)
- [ ] Update `RESEND_FROM_EMAIL` to use your domain
- [ ] Set up webhook secret for delivery tracking
- [ ] Consider upgrading to Pro tier if needed
- [ ] Set up separate API key for production

---

## 🧪 Testing Your Resend Configuration

### Quick Test via Code:

```typescript
// Test in your Next.js app
// Create: src/app/api/test-email/route.ts

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: 'your-email@example.com', // Your email
      subject: 'Test Email from WeddingFlow Pro',
      html: '<strong>It works!</strong>',
    })

    if (error) {
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ success: true, emailId: data?.id })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

**Test it:**
```bash
# Start your dev server
npm run dev

# Visit in browser or curl
curl http://localhost:3000/api/test-email

# Check your email inbox!
```

---

## 🆘 Troubleshooting

### Problem: "Invalid API key" error
**Solution:**
1. Check if API key in `.env.local` is correct
2. Verify API key exists at https://resend.com/api-keys
3. Make sure you restarted dev server after changing `.env.local`

### Problem: "Can't find Resend username"
**Solution:**
- Resend doesn't use usernames! Only API keys.
- Your "username" is your Resend account email (used to login to dashboard)
- You don't need a username to send emails - just the API key

### Problem: Emails not sending
**Solution:**
1. Check API key is valid
2. Verify `RESEND_FROM_EMAIL` is set correctly
3. Check Resend dashboard for error logs
4. Verify you haven't exceeded daily limit (100 emails/day on free tier)

### Problem: Need to find old account
**Solution:**
1. Search email for "resend.com" or "team@resend.com"
2. Try logging in with different email addresses
3. Contact Resend support if needed
4. Create new account if unable to recover

---

## 📞 Resend Support

- **Documentation:** https://resend.com/docs
- **API Reference:** https://resend.com/docs/api-reference
- **Support Email:** support@resend.com
- **Status Page:** https://status.resend.com
- **Community:** https://github.com/resendlabs/resend-node/discussions

---

## ✅ Summary

### What You Have:
- ✅ Resend API key configured
- ✅ From email configured (test mode)
- ✅ Ready to send emails in development

### What You DON'T Need:
- ❌ Username (Resend doesn't use usernames!)
- ❌ Password (API key only authentication)
- ❌ SMTP settings (It's an API, not SMTP)

### What's Optional:
- ⚠️ Webhook secret (for production email tracking)
- ⚠️ Custom domain (for production emails)
- ⚠️ Multiple API keys (for different environments)

---

**Your Resend setup is ready for development!** 🎉

No username needed - just your API key. To send emails, the app uses:
```typescript
const resend = new Resend(process.env.RESEND_API_KEY)
```

That's it!

---

**Last Updated:** 2025-11-17
**Status:** 🟢 READY FOR DEVELOPMENT
**Missing:** Webhook secret (optional for now)
