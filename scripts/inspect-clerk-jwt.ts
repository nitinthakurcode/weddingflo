/**
 * Inspect Clerk JWT Structure for 2025 Native Integration
 *
 * This script helps verify the JWT Clerk is generating matches
 * what Supabase expects for 2025 native integration
 */

async function inspectClerkJWT() {
  console.log('\n==========================================');
  console.log('🔍 Clerk JWT Inspection for 2025 Native Integration');
  console.log('==========================================\n');

  // Get Clerk domain from environment
  const clerkDomain = 'skilled-sawfish-5.clerk.accounts.dev';
  const jwksUrl = `https://${clerkDomain}/.well-known/jwks.json`;

  console.log('1️⃣  Checking Clerk JWKS Endpoint...\n');
  console.log(`   URL: ${jwksUrl}\n`);

  try {
    const response = await fetch(jwksUrl);
    const jwks = await response.json();

    console.log('✅ JWKS Endpoint Accessible\n');
    console.log(`📊 Found ${jwks.keys.length} key(s):\n`);

    jwks.keys.forEach((key: any, idx: number) => {
      console.log(`   Key ${idx + 1}:`);
      console.log(`   - Type (kty): ${key.kty}`);
      console.log(`   - Algorithm (alg): ${key.alg}`);
      console.log(`   - Key ID (kid): ${key.kid}`);
      console.log(`   - Use: ${key.use}`);

      if (key.kty === 'EC') {
        console.log(`   - Curve: ${key.crv} ${key.crv === 'P-256' ? '✅' : '⚠️'}`);
      }

      if (key.kty === 'RSA') {
        console.log(`   - Modulus length: ${key.n?.length || 'N/A'} chars`);
      }

      console.log('');
    });

    // Verify 2025 compliance
    console.log('2️⃣  2025 Native Integration Compliance:\n');

    const hasModernKey = jwks.keys.some((key: any) =>
      key.alg === 'RS256' || key.alg === 'ES256'
    );

    const hasLegacyKey = jwks.keys.some((key: any) =>
      key.alg === 'HS256'
    );

    if (hasModernKey && !hasLegacyKey) {
      console.log('   ✅ Using modern asymmetric signing (RS256/ES256)');
      console.log('   ✅ No legacy HS256 keys found');
      console.log('   ✅ Compatible with 2025 native integration\n');
    } else if (hasLegacyKey) {
      console.log('   ⚠️  Legacy HS256 keys still present');
      console.log('   ⚠️  Should rotate to RS256/ES256\n');
    } else {
      console.log('   ❓ Unknown key configuration\n');
    }

    // Check what JWT structure looks like
    console.log('3️⃣  Expected JWT Structure:\n');
    console.log('   When browser makes request to Supabase:\n');
    console.log('   GET /rest/v1/users');
    console.log('   Headers:');
    console.log('     apikey: sb_publishable_...');
    console.log('     Authorization: Bearer <JWT-from-Clerk>\n');

    console.log('   JWT Header (expected):');
    console.log('   {');
    console.log(`     "alg": "RS256" or "ES256",  <- Modern (2025)`);
    console.log(`     "kid": "ins_...",  <- Key ID from JWKS`);
    console.log(`     "typ": "JWT"`);
    console.log('   }\n');

    console.log('   JWT Payload (expected):');
    console.log('   {');
    console.log(`     "iss": "https://${clerkDomain}",  <- Issuer`);
    console.log(`     "sub": "user_xxxxx",  <- Clerk User ID (clerk_id)`);
    console.log(`     "azp": "http://localhost:3000",  <- Authorized party`);
    console.log(`     "sid": "sess_xxxxx",  <- Session ID`);
    console.log(`     "exp": 1234567890,  <- Expiration`);
    console.log(`     "iat": 1234567890  <- Issued at`);
    console.log('   }\n');

    // Explain the flow
    console.log('4️⃣  2025 Native Integration Flow:\n');
    console.log('   Step 1: Browser calls getToken() from Clerk');
    console.log('           Returns JWT signed with RS256 (using private key)\n');

    console.log('   Step 2: Browser sends JWT to Supabase');
    console.log('           Authorization: Bearer <JWT>\n');

    console.log('   Step 3: Supabase receives JWT');
    console.log(`           Fetches public key from: ${jwksUrl}\n`);

    console.log('   Step 4: Supabase validates JWT signature');
    console.log('           Uses public key to verify RS256 signature\n');

    console.log('   Step 5: Supabase extracts claims');
    console.log('           auth.jwt()->>\'sub\' returns clerk_id\n');

    console.log('   Step 6: RLS policies execute');
    console.log('           WHERE clerk_id = auth.jwt()->>\'sub\'\n');

    console.log('   Step 7: Data returned to browser ✅\n');

    // Check for common issues
    console.log('5️⃣  Common Issues Checklist:\n');

    const checks = [
      {
        name: 'JWKS endpoint accessible',
        status: response.ok,
        fix: 'Ensure Clerk domain is correct'
      },
      {
        name: 'Modern signing algorithm (RS256/ES256)',
        status: hasModernKey,
        fix: 'Rotate JWT signing keys in Supabase Dashboard'
      },
      {
        name: 'No legacy HS256 keys',
        status: !hasLegacyKey,
        fix: 'Revoke legacy HS256 keys in Supabase'
      },
    ];

    checks.forEach(check => {
      console.log(`   ${check.status ? '✅' : '❌'} ${check.name}`);
      if (!check.status) {
        console.log(`      Fix: ${check.fix}`);
      }
    });

    console.log('\n6️⃣  What to Check in Browser:\n');
    console.log('   1. Open DevTools → Network tab');
    console.log('   2. Filter for: gkrcaeymhgjepncbceag.supabase.co');
    console.log('   3. Find request to: /rest/v1/users');
    console.log('   4. Click request → Headers tab');
    console.log('   5. Look for Authorization header');
    console.log('   6. Copy JWT (starts with eyJ...)');
    console.log('   7. Paste at jwt.io to decode');
    console.log('   8. Verify header.alg is RS256 or ES256\n');

    console.log('==========================================');
    console.log('✅ Inspection Complete');
    console.log('==========================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

inspectClerkJWT();
