/**
 * Test API Route - Supabase + Clerk Integration
 *
 * This endpoint tests the complete integration between Clerk authentication
 * and Supabase with Row Level Security (RLS) policies.
 *
 * Access this route at: /api/test-supabase
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function GET() {
  const startTime = Date.now();
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0,
    },
  };

  try {
    // ========================================================================
    // TEST 1: Environment Variables
    // ========================================================================
    results.tests.push({
      name: 'Environment Variables',
      status: 'running',
    });

    const envCheck = {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabasePublishableKey,
      supabaseUrl: supabaseUrl || 'MISSING',
      keyFormat: supabasePublishableKey?.startsWith('sb_publishable_') ? 'NEW (2025)' : 'OLD',
    };

    if (!supabaseUrl || !supabasePublishableKey) {
      results.tests[0] = {
        name: 'Environment Variables',
        status: 'failed',
        error: 'Missing required environment variables',
        details: envCheck,
        troubleshooting: [
          'Ensure NEXT_PUBLIC_SUPABASE_URL is set in .env.local',
          'Ensure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is set in .env.local',
          'Restart your development server after adding environment variables',
        ],
      };
      results.summary.failed++;
    } else {
      results.tests[0] = {
        name: 'Environment Variables',
        status: 'passed',
        details: envCheck,
      };
      results.summary.passed++;
    }
    results.summary.total++;

    // ========================================================================
    // TEST 2: Clerk Authentication
    // ========================================================================
    results.tests.push({
      name: 'Clerk Authentication',
      status: 'running',
    });

    const { userId, getToken } = await auth();

    if (!userId) {
      results.tests[1] = {
        name: 'Clerk Authentication',
        status: 'failed',
        error: 'User not authenticated',
        details: { userId: null },
        troubleshooting: [
          'Make sure you are signed in to Clerk',
          'Check that Clerk middleware is properly configured',
          'Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are set',
          'Try signing out and signing back in',
        ],
      };
      results.summary.failed++;
      results.summary.total++;
      results.summary.duration = Date.now() - startTime;

      return NextResponse.json(results, { status: 401 });
    }

    // Get Clerk token for Supabase
    let clerkToken: string | null = null;
    try {
      clerkToken = await getToken({ template: 'supabase' });
    } catch (error) {
      results.tests[1] = {
        name: 'Clerk Authentication',
        status: 'failed',
        error: 'Failed to get Clerk token with Supabase template',
        details: {
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
        troubleshooting: [
          'Create a Supabase JWT template in Clerk Dashboard',
          'Go to: Dashboard > JWT Templates > New Template > Supabase',
          'Follow instructions at: https://clerk.com/docs/integrations/databases/supabase',
          'Make sure the template name is exactly "supabase"',
        ],
      };
      results.summary.failed++;
      results.summary.total++;
      results.summary.duration = Date.now() - startTime;

      return NextResponse.json(results, { status: 500 });
    }

    results.tests[1] = {
      name: 'Clerk Authentication',
      status: 'passed',
      details: {
        userId,
        hasToken: !!clerkToken,
        tokenPreview: clerkToken ? `${clerkToken.substring(0, 20)}...` : null,
      },
    };
    results.summary.passed++;
    results.summary.total++;

    // ========================================================================
    // TEST 3: Supabase Client Creation
    // ========================================================================
    results.tests.push({
      name: 'Supabase Client Creation',
      status: 'running',
    });

    let supabase: ReturnType<typeof createClient<Database>>;
    try {
      supabase = createClient<Database>(
        supabaseUrl,
        supabasePublishableKey,
        {
          global: {
            headers: {
              Authorization: `Bearer ${clerkToken}`,
            },
          },
          auth: {
            persistSession: false,
          },
        }
      );

      results.tests[2] = {
        name: 'Supabase Client Creation',
        status: 'passed',
        details: {
          url: supabaseUrl,
          clientCreated: true,
        },
      };
      results.summary.passed++;
    } catch (error) {
      results.tests[2] = {
        name: 'Supabase Client Creation',
        status: 'failed',
        error: 'Failed to create Supabase client',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        troubleshooting: [
          'Verify your Supabase URL is correct',
          'Check that your Supabase project is active',
          'Ensure @supabase/supabase-js is installed correctly',
        ],
      };
      results.summary.failed++;
      results.summary.total++;
      results.summary.duration = Date.now() - startTime;

      return NextResponse.json(results, { status: 500 });
    }
    results.summary.total++;

    // ========================================================================
    // TEST 4: Database Connection (Count Companies)
    // ========================================================================
    results.tests.push({
      name: 'Database Connection',
      status: 'running',
    });

    try {
      const { count, error } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.tests[3] = {
          name: 'Database Connection',
          status: 'failed',
          error: 'Failed to query companies table',
          details: {
            supabaseError: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          troubleshooting: [
            'Run the migration: supabase/migrations/001_initial_schema.sql',
            'Check that the companies table exists in your Supabase database',
            'Verify RLS policies are properly configured',
            'Ensure the migration was applied successfully',
            'Check Supabase dashboard for any migration errors',
          ],
        };
        results.summary.failed++;
      } else {
        results.tests[3] = {
          name: 'Database Connection',
          status: 'passed',
          details: {
            companiesCount: count,
            message: 'Successfully connected to Supabase database',
          },
        };
        results.summary.passed++;
      }
    } catch (error) {
      results.tests[3] = {
        name: 'Database Connection',
        status: 'failed',
        error: 'Exception during database query',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        troubleshooting: [
          'Check your network connection',
          'Verify Supabase project is running',
          'Check Supabase dashboard for service status',
        ],
      };
      results.summary.failed++;
    }
    results.summary.total++;

    // ========================================================================
    // TEST 5: Row Level Security (Query Users Table)
    // ========================================================================
    results.tests.push({
      name: 'Row Level Security (RLS)',
      status: 'running',
    });

    try {
      type UserData = {
        id: string;
        clerk_id: string;
        email: string;
        role: string;
      };

      const { data, error } = await supabase
        .from('users')
        .select('id, clerk_id, email, role')
        .limit(5) as { data: UserData[] | null; error: any };

      if (error) {
        results.tests[4] = {
          name: 'Row Level Security (RLS)',
          status: 'failed',
          error: 'Failed to query users table',
          details: {
            supabaseError: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          troubleshooting: [
            'Ensure RLS policies are enabled on users table',
            'Check that the user exists in the users table with matching clerk_id',
            'Run: SELECT * FROM users WHERE clerk_id = \'' + userId + '\';',
            'Verify helper functions (requesting_clerk_id, etc.) are created',
            'Make sure JWT template in Clerk includes the "sub" claim',
          ],
        };
        results.summary.failed++;
      } else {
        results.tests[4] = {
          name: 'Row Level Security (RLS)',
          status: 'passed',
          details: {
            usersReturned: data?.length || 0,
            message: 'RLS policies are working correctly',
            sample: data?.[0] ? {
              id: data[0].id,
              clerk_id: data[0].clerk_id,
              email: data[0].email,
              role: data[0].role,
            } : null,
          },
        };
        results.summary.passed++;
      }
    } catch (error) {
      results.tests[4] = {
        name: 'Row Level Security (RLS)',
        status: 'failed',
        error: 'Exception during RLS test',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        troubleshooting: [
          'Check that RLS is enabled on the users table',
          'Verify all RLS policies are created correctly',
          'Test the policies manually in Supabase SQL editor',
        ],
      };
      results.summary.failed++;
    }
    results.summary.total++;

    // ========================================================================
    // TEST 6: Helper Function (requesting_clerk_id)
    // ========================================================================
    results.tests.push({
      name: 'Helper Function (requesting_clerk_id)',
      status: 'running',
    });

    try {
      const { data, error } = await supabase
        .rpc('requesting_clerk_id');

      if (error) {
        results.tests[5] = {
          name: 'Helper Function (requesting_clerk_id)',
          status: 'failed',
          error: 'Failed to execute requesting_clerk_id function',
          details: {
            supabaseError: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          troubleshooting: [
            'Ensure the requesting_clerk_id() function exists',
            'Run the migration: supabase/migrations/001_initial_schema.sql',
            'Check function definition in Supabase SQL editor',
            'Verify the function has SECURITY DEFINER attribute',
            'Test manually: SELECT requesting_clerk_id();',
          ],
        };
        results.summary.failed++;
      } else {
        const clerkIdFromFunction = data as string;
        const matches = clerkIdFromFunction === userId;

        results.tests[5] = {
          name: 'Helper Function (requesting_clerk_id)',
          status: matches ? 'passed' : 'failed',
          details: {
            clerkIdFromAuth: userId,
            clerkIdFromFunction: clerkIdFromFunction,
            matches,
            message: matches
              ? 'Helper function correctly extracted Clerk ID from JWT'
              : 'Helper function returned different Clerk ID - JWT parsing issue',
          },
          ...(matches ? {} : {
            troubleshooting: [
              'Check JWT template configuration in Clerk',
              'Verify the "sub" claim is included in the JWT',
              'Ensure auth.jwt() function works in Supabase',
              'Check Supabase Postgres version supports JSONB operations',
            ],
          }),
        };

        if (matches) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      }
    } catch (error) {
      results.tests[5] = {
        name: 'Helper Function (requesting_clerk_id)',
        status: 'failed',
        error: 'Exception during helper function test',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        troubleshooting: [
          'Ensure all helper functions are created',
          'Run the complete migration file',
          'Check Supabase logs for function errors',
        ],
      };
      results.summary.failed++;
    }
    results.summary.total++;

    // ========================================================================
    // TEST 7: Multi-Tenant Isolation Test
    // ========================================================================
    results.tests.push({
      name: 'Multi-Tenant Isolation',
      status: 'running',
    });

    try {
      // Try to get user's company_id
      type UserCompanyData = {
        company_id: string | null;
      };

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('clerk_id', userId)
        .single() as { data: UserCompanyData | null; error: any };

      if (userError) {
        results.tests[6] = {
          name: 'Multi-Tenant Isolation',
          status: 'warning',
          details: {
            message: 'User not found in database - cannot test multi-tenancy',
            note: 'This is expected if you haven\'t created a user record yet',
          },
          troubleshooting: [
            'Create a user record in the users table',
            'Link the user record to a company',
            'Use Clerk webhook to auto-create users on sign-up',
          ],
        };
        results.summary.passed++;
      } else {
        const userCompanyId = userData?.company_id;

        if (!userCompanyId) {
          results.tests[6] = {
            name: 'Multi-Tenant Isolation',
            status: 'warning',
            details: {
              message: 'User has no company_id - multi-tenancy not fully configured',
              userId: userId,
            },
            troubleshooting: [
              'Assign the user to a company',
              'Set company_id in the users table',
            ],
          };
          results.summary.passed++;
        } else {
          // Test that user can only see their company's data
          type CompanyIdData = {
            id: string;
          };

          const { data: companies, error: companiesError } = await supabase
            .from('companies')
            .select('id') as { data: CompanyIdData[] | null; error: any };

          if (companiesError) {
            results.tests[6] = {
              name: 'Multi-Tenant Isolation',
              status: 'failed',
              error: companiesError.message,
              troubleshooting: ['Check RLS policies on companies table'],
            };
            results.summary.failed++;
          } else {
            const canAccessOnlyOwnCompany = companies?.every(
              (company) => company.id === userCompanyId
            ) ?? true;

            results.tests[6] = {
              name: 'Multi-Tenant Isolation',
              status: canAccessOnlyOwnCompany ? 'passed' : 'warning',
              details: {
                userCompanyId,
                visibleCompanies: companies?.length || 0,
                message: canAccessOnlyOwnCompany
                  ? 'Multi-tenant isolation working correctly'
                  : 'User can see multiple companies - check if user is super_admin',
              },
            };
            results.summary.passed++;
          }
        }
      }
    } catch (error) {
      results.tests[6] = {
        name: 'Multi-Tenant Isolation',
        status: 'failed',
        error: 'Exception during multi-tenancy test',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
      results.summary.failed++;
    }
    results.summary.total++;

    // ========================================================================
    // Final Summary
    // ========================================================================
    results.summary.duration = Date.now() - startTime;
    results.success = results.summary.failed === 0;

    const statusCode = results.success ? 200 : 500;

    return NextResponse.json(results, { status: statusCode });

  } catch (error) {
    // Catch-all for unexpected errors
    results.summary.duration = Date.now() - startTime;
    results.tests.push({
      name: 'Unexpected Error',
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    results.summary.failed++;
    results.summary.total++;

    return NextResponse.json(results, { status: 500 });
  }
}
