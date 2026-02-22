#!/bin/bash
# =============================================================================
# WeddingFlo — Phase 1.1: Emergency Secret Rotation
# Run ONLY if your app was exposed during the React2Shell window (Dec 3-7, 2025)
# and was running Next.js < 16.0.7
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${RED}=============================================="
echo " EMERGENCY SECRET ROTATION"
echo "==============================================${NC}"
echo ""
echo "This script generates new secrets and guides you through rotation."
echo "It does NOT automatically update your .env or services."
echo ""
echo -e "${YELLOW}WARNING: Rotating BETTER_AUTH_SECRET will invalidate ALL user sessions.${NC}"
echo "         Users will need to sign in again."
echo ""

read -p "Continue? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "=============================================="
echo " GENERATED NEW SECRETS"
echo "=============================================="
echo ""

# 1. BETTER_AUTH_SECRET
NEW_AUTH_SECRET=$(openssl rand -base64 32)
echo -e "${CYAN}1. BETTER_AUTH_SECRET${NC}"
echo "   New value: $NEW_AUTH_SECRET"
echo "   Action:  Update in .env → restart app"
echo "   Impact:  All sessions invalidated (users re-login)"
echo ""

# 2. DATABASE_URL password
NEW_DB_PASS=$(openssl rand -base64 24 | tr -d '/+=')
echo -e "${CYAN}2. DATABASE_URL password${NC}"
echo "   New password: $NEW_DB_PASS"
echo "   Action:"
echo "     a) Connect to PostgreSQL as superuser"
echo "     b) ALTER USER weddingflo_user WITH PASSWORD '$NEW_DB_PASS';"
echo "     c) Update DATABASE_URL in .env"
echo "     d) Restart app"
echo ""

# 3. TOKEN_ENCRYPTION_KEY (if you have one)
NEW_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo -e "${CYAN}3. TOKEN_ENCRYPTION_KEY (for OAuth token encryption)${NC}"
echo "   New value: $NEW_ENCRYPTION_KEY"
echo "   Action:  Update in .env"
echo "   Impact:  Existing encrypted tokens become unreadable."
echo "            Users must re-authenticate with Google OAuth."
echo ""

echo "=============================================="
echo " EXTERNAL SERVICE KEYS — ROTATE MANUALLY"
echo "=============================================="
echo ""

cat << 'EOF'
4. OPENAI_API_KEY
   → https://platform.openai.com/api-keys
   → Revoke old key, generate new one, update .env

5. STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
   → https://dashboard.stripe.com/apikeys
   → Roll the key (Stripe supports rolling without downtime)
   → Update webhook signing secret in Stripe Dashboard

6. AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
   → https://console.aws.amazon.com/iam
   → Create new access key → update .env → delete old key

7. RESEND_API_KEY
   → https://resend.com/api-keys
   → Revoke old, create new, update .env

8. TWILIO_AUTH_TOKEN
   → https://console.twilio.com
   → Rotate auth token (Account → API Keys & Tokens)

9. GOOGLE_CLIENT_SECRET
   → https://console.cloud.google.com/apis/credentials
   → Regenerate OAuth 2.0 client secret, update .env

10. Firebase Admin SDK Private Key
    → https://console.firebase.google.com → Project Settings → Service Accounts
    → Generate new private key, update the JSON file

11. UPSTASH_REDIS_REST_TOKEN
    → https://console.upstash.com
    → Reset REST token in database settings
EOF

echo ""
echo "=============================================="
echo " POST-ROTATION CHECKLIST"
echo "=============================================="
echo ""

cat << 'EOF'
After updating all secrets:

  [ ] Update .env on Hostinger VPS
  [ ] Restart the application: pm2 restart all (or your process manager)
  [ ] Verify health: curl https://app.weddingflow.pro/api/health
  [ ] Test sign-in (email/password)
  [ ] Test sign-in (Google OAuth)
  [ ] Test AI chatbot (OpenAI key)
  [ ] Test file upload (AWS S3)
  [ ] Test payment flow (Stripe)
  [ ] Test email sending (Resend)
  [ ] Test SMS (Twilio)
  [ ] Test real-time sync (Upstash Redis)
  [ ] Monitor Sentry for errors for 30 minutes
  [ ] Delete this script from the server
EOF

echo ""
echo -e "${GREEN}Secret generation complete. Follow the manual steps above.${NC}"
