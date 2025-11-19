import { clerkClient } from '@clerk/nextjs/server';

const userId = 'user_35eFOuqtK9pqqw5xcQjI5gJ89gl';
const companyId = '49405210-b6e9-45d4-a691-ca06c3b2ea6e';

try {
  const clerk = await clerkClient();
  const user = await clerk.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: 'super_admin',
      company_id: companyId,
      onboarding_completed: true,
    },
  });
  
  console.log('✅ Updated Clerk metadata successfully!');
  console.log('User ID:', user.id);
  console.log('Public Metadata:', JSON.stringify(user.publicMetadata, null, 2));
  process.exit(0);
} catch (error) {
  console.error('❌ Error updating Clerk metadata:', error.message);
  console.error('Error details:', error);
  process.exit(1);
}
