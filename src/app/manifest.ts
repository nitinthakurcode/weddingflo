import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WeddingFlow Pro - Complete Wedding Management',
    short_name: 'WeddingFlow',
    description: 'Professional wedding planning and management app with guest management, budget tracking, vendor coordination, and timeline planning.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['productivity', 'business', 'lifestyle'],
    screenshots: [
      {
        src: '/screenshots/dashboard.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
      },
      {
        src: '/screenshots/guests.png',
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow',
      },
    ],
    shortcuts: [
      {
        name: 'Guest List',
        short_name: 'Guests',
        description: 'View and manage wedding guests',
        url: '/dashboard/guests',
        icons: [{ src: '/icons/shortcut-guests.png', sizes: '96x96' }],
      },
      {
        name: 'Budget',
        short_name: 'Budget',
        description: 'Track wedding expenses',
        url: '/dashboard/budget',
        icons: [{ src: '/icons/shortcut-budget.png', sizes: '96x96' }],
      },
      {
        name: 'Check-In',
        short_name: 'Check-In',
        description: 'Check in guests at the event',
        url: '/check-in',
        icons: [{ src: '/icons/shortcut-checkin.png', sizes: '96x96' }],
      },
    ],
  };
}
