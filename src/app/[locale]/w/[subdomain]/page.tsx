import { notFound } from 'next/navigation';
import { createServerSupabaseAdminClient } from '@/lib/supabase/server';
import { getTemplate, generateTemplateCSS, getTemplateFontLinks } from '@/lib/templates/wedding-templates';
import { WebsiteRenderer } from '@/components/websites/public/website-renderer';
import { PasswordProtection } from '@/components/websites/public/password-protection';
import { cookies } from 'next/headers';

/**
 * Public Wedding Website Viewer
 * Session 49: Beautiful template-based websites
 *
 * URL: /w/[subdomain]
 * Example: /w/john-jane
 *
 * Features:
 * - Template rendering
 * - Password protection
 * - Analytics tracking
 * - SEO metadata
 */

interface PageProps {
  params: Promise<{
    subdomain: string;
    locale: string;
  }>;
  searchParams: Promise<{
    password?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { subdomain } = await params;
  const supabase = createServerSupabaseAdminClient();

  const { data: website } = await supabase
    .from('wedding_websites')
    .select('*')
    .eq('subdomain', subdomain)
    .eq('is_published', true)
    .maybeSingle();

  if (!website) {
    return {
      title: 'Website Not Found',
    };
  }

  const heroSection = website.hero_section as any;

  return {
    title: website.meta_title || `${heroSection?.title || 'Wedding'} - WeddingFlow`,
    description:
      website.meta_description ||
      `${heroSection?.subtitle || "We're getting married!"} Join us to celebrate!`,
    openGraph: {
      title: website.meta_title || heroSection?.title,
      description: website.meta_description || heroSection?.subtitle,
      images: website.og_image_url ? [website.og_image_url] : [],
    },
  };
}

export default async function PublicWebsitePage({ params, searchParams }: PageProps) {
  const { subdomain } = await params;
  const { password } = await searchParams;

  const supabase = createServerSupabaseAdminClient();

  // Fetch website
  const { data: website, error } = await supabase
    .from('wedding_websites')
    .select('*')
    .eq('subdomain', subdomain)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !website) {
    notFound();
  }

  // Check password protection
  const cookieStore = await cookies();
  const sessionPassword = cookieStore.get(`website-password-${website.id}`)?.value;

  if (website.is_password_protected && !sessionPassword && !password) {
    return <PasswordProtection websiteId={website.id} subdomain={subdomain} />;
  }

  // Get template
  const template = getTemplate(website.template_id);
  if (!template) {
    return <div>Template not found</div>;
  }

  // Generate template CSS
  const templateCSS = generateTemplateCSS(template);
  const fontLinks = getTemplateFontLinks(template);

  return (
    <>
      {/* Load Google Fonts */}
      {fontLinks.map((link) => (
        <link key={link} rel="stylesheet" href={link} />
      ))}

      {/* Template CSS */}
      <style dangerouslySetInnerHTML={{ __html: templateCSS }} />

      {/* Render Website */}
      <WebsiteRenderer website={website} template={template} />
    </>
  );
}
