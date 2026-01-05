'use client';

import { useEffect } from 'react';

/**
 * ThemeInjector - Client-side component that fixes avatar images
 * Ensures proper aspect ratio and styling for all avatar images
 */
export function ThemeInjector() {
  useEffect(() => {
    // Avatar fix - Target all avatar images in the UI
    const fixAvatars = () => {
      // Find ALL images in the header that could be avatars
      const allImages = document.querySelectorAll<HTMLImageElement>(
        'header img, img[class*="avatar"], img[class*="Avatar"], [data-avatar] img, ' +
        'button[aria-label*="account" i] img, button[aria-label*="profile" i] img, ' +
        '[role="img"] img, img[alt*="profile" i], img[alt*="avatar" i], ' +
        'button img[src*="googleusercontent"], ' +
        'button img[src*="gravatar"], img[src*="profile"]'
      );

      allImages.forEach((img) => {
        // FORCE proper square aspect ratio + cover fit
        img.style.setProperty('object-fit', 'cover', 'important');
        img.style.setProperty('object-position', 'center', 'important');
        img.style.setProperty('width', '100%', 'important');
        img.style.setProperty('height', '100%', 'important');
        img.style.setProperty('aspect-ratio', '1 / 1', 'important');
        img.style.setProperty('border-radius', '50%', 'important');
        img.style.setProperty('display', 'block', 'important');

        // Fix parent containers to maintain square shape
        let parent = img.parentElement;
        let depth = 0;
        while (parent && depth < 3) {
          parent.style.setProperty('aspect-ratio', '1 / 1', 'important');
          parent.style.setProperty('overflow', 'hidden', 'important');
          parent.style.setProperty('border-radius', '50%', 'important');
          parent = parent.parentElement;
          depth++;
        }
      });
    };

    // Run immediately
    fixAvatars();

    // CONTINUOUS MONITORING - Run every 100ms forever
    const interval = setInterval(fixAvatars, 100);

    // ALSO run on specific timings
    setTimeout(fixAvatars, 50);
    setTimeout(fixAvatars, 200);
    setTimeout(fixAvatars, 500);
    setTimeout(fixAvatars, 1000);
    setTimeout(fixAvatars, 2000);
    setTimeout(fixAvatars, 3000);
    setTimeout(fixAvatars, 5000);

    // Listen for DOM changes
    const observer = new MutationObserver(fixAvatars);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'class', 'style', 'data-loaded']
    });

    // Listen for image load events
    document.addEventListener('load', fixAvatars, true);

    return () => {
      clearInterval(interval);
      observer.disconnect();
      document.removeEventListener('load', fixAvatars, true);
    };
  }, []);

  return null;
}
