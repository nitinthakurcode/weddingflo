/**
 * Create Super Admin Script - February 2026
 *
 * CLI tool to create platform super administrators.
 * This should NEVER be exposed via a public web endpoint.
 *
 * Usage:
 *   npx tsx scripts/create-super-admin.ts <email> <password> <name>
 *
 * Example:
 *   npx tsx scripts/create-super-admin.ts admin@example.com "SecurePass123!" "Admin User"
 *
 * Requires:
 *   - Direct database access (DATABASE_URL env var)
 *   - bcryptjs for password hashing
 */

import { db, eq } from '../src/lib/db';
import { user as userTable, account } from '../src/lib/db/schema';
import { hash } from 'bcryptjs';
import { randomUUID } from 'crypto';

async function createSuperAdmin(email: string, password: string, name: string) {
  // Validate inputs
  if (!email || !password || !name) {
    console.error('Usage: npx tsx scripts/create-super-admin.ts <email> <password> <name>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }

  if (!email.includes('@')) {
    console.error('Error: Invalid email format');
    process.exit(1);
  }

  // Check if user already exists
  const [existingUser] = await db
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  if (existingUser) {
    if (existingUser.role === 'super_admin') {
      console.log(`User ${email} is already a super admin.`);
      process.exit(0);
    }

    // Update existing user to super admin
    await db
      .update(userTable)
      .set({
        role: 'super_admin',
        companyId: null, // Super admins don't belong to a company
        isActive: true,
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, existingUser.id));

    console.log(`Updated existing user ${email} to super admin role.`);
    process.exit(0);
  }

  // Create new super admin user
  const userId = randomUUID();
  const hashedPassword = await hash(password, 12);

  // Parse name
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  try {
    // Insert user record
    await db.insert(userTable).values({
      id: userId,
      email,
      name,
      firstName,
      lastName,
      emailVerified: true, // Skip email verification for CLI-created admins
      role: 'super_admin',
      companyId: null, // Super admins don't belong to a company
      isActive: true,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create account record for email/password auth
    await db.insert(account).values({
      id: randomUUID(),
      userId: userId,
      accountId: email,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`
Super Admin created successfully!

Email: ${email}
Name: ${name}
Role: super_admin
User ID: ${userId}

You can now sign in at /superadmin/sign-in
    `);
  } catch (error) {
    console.error('Failed to create super admin:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const [email, password, name] = args;

createSuperAdmin(email, password, name).catch(console.error);
