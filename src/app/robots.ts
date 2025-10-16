import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weddingflow-pro.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/settings/',
          '/api/',
          '/admin/',
          '/messages/',
          '/qr/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
