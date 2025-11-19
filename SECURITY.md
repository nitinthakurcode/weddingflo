# Security Policy

## Critical Security Updates

### xlsx Security Update (2025-10-20)

**CRITICAL FIX APPLIED ✓**

**Previous Status:** VULNERABLE
**Current Status:** PATCHED AND SECURE

**What Changed:**
- **Removed:** xlsx 0.18.5 (vulnerable npm version)
- **Installed:** xlsx 0.20.2 (patched version from cdn.sheetjs.com)
- **Source:** Official SheetJS CDN (https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz)

**Vulnerabilities Fixed:**
- ✅ **CVE-2023-30533** - Prototype Pollution (HIGH SEVERITY)
- ✅ **CVE-2024-22363** - Regular Expression Denial of Service (ReDoS)

**Why This Was Critical:**
- App **PARSES user-uploaded Excel/CSV files** (guest lists, vendor data, budget imports)
- Prototype pollution exploitable when processing untrusted files
- Attack vector: Malicious user uploads crafted Excel file → RCE potential
- **Risk Level:** CRITICAL (user-facing file upload feature)

**Technical Details:**
- SheetJS moved from npm to CDN-based distribution
- npm version (0.18.5) is outdated and unmaintained
- CDN version (0.20.2) is actively maintained with security patches
- Installation: `npm install https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz`

**Verification:**
```bash
node -e "const XLSX = require('xlsx'); console.log(XLSX.version)"
# Output: 0.20.2
```

**Audit Status:**
```bash
npm audit --production
# Output: found 0 vulnerabilities
```

---

## Additional Security Fixes (2025-10-20)

### Package Upgrades

1. **ai** - 3.0.0 → 5.0.76
   - Fixed: XSS vulnerability via jsondiffpatch dependency
   - Impact: AI chat features

2. **jspdf** - 2.5.1 → 3.0.3
   - Fixed: XSS vulnerability via dompurify dependency
   - Impact: PDF generation

3. **jspdf-autotable** - 3.8.0 → 5.0.2
   - Updated for compatibility with jspdf@3.0.3

4. **langchain** - REMOVED
   - SQL injection vulnerability in @langchain/community
   - Package was unused in production code

### Current Security Status

**Production Dependencies:** 0 vulnerabilities ✓
**Development Dependencies:** 0 vulnerabilities ✓
**Last Audit:** 2025-10-20

---

## Reporting Security Issues

If you discover a security vulnerability, please email security@weddingflow.com

Do not open public GitHub issues for security vulnerabilities.

---

## Security Best Practices

### Authentication
- Clerk-based authentication with session claims
- Role-based access control (RBAC)
- No database queries for auth checks (uses session metadata)

### Database Security
- Supabase Row Level Security (RLS) policies
- Parameterized queries via tRPC
- No raw SQL from user input

### API Security
- tRPC type-safe endpoints
- Zod schema validation
- Rate limiting on critical endpoints

### File Upload Security
- **xlsx 0.20.2** - Patched version with prototype pollution fix
- File type validation (MIME type checking)
- File size limits enforced
- Virus scanning on uploads (TODO: implement ClamAV)
- Sandboxed file processing

### Frontend Security
- Content Security Policy (CSP)
- XSS protection via React/Next.js sanitization
- HTTPS-only in production
- Subresource Integrity (SRI) for CDN resources

### Third-Party Integrations
- Stripe: PCI-compliant payment processing
- Twilio: Secure SMS delivery
- Resend: Verified email sender
- Sentry: Error tracking with data scrubbing
- PostHog: Privacy-focused analytics

---

## Security Monitoring

### Automated Checks
- npm audit on every deployment
- Dependabot security updates
- Sentry error monitoring
- Rate limiting logs

### Manual Reviews
- Quarterly dependency audits
- Annual penetration testing
- Code reviews for security-sensitive features

---

## Compliance

### Data Protection
- GDPR-compliant data handling
- User data deletion on request
- Encrypted data at rest (Supabase)
- Encrypted data in transit (TLS 1.3)

### Payment Security
- PCI DSS compliance via Stripe
- No credit card data stored locally
- Tokenized payment methods only

---

Last Updated: 2025-10-20
Security Audit Status: **PASSING** ✓
