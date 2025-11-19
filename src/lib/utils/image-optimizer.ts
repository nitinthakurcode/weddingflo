/**
 * Get optimized image URL with proper sizing
 */
export function getOptimizedImageUrl(
  src: string,
  width: number,
  quality: number = 75
): string {
  if (!src) return '';

  // If already a data URL or external URL, return as-is
  if (src.startsWith('data:') || src.startsWith('http')) {
    return src;
  }

  // Use Next.js Image Optimization API
  const params = new URLSearchParams({
    url: src,
    w: width.toString(),
    q: quality.toString(),
  });

  return `/_next/image?${params.toString()}`;
}

/**
 * Get responsive image srcSet
 */
export function getResponsiveSrcSet(src: string, quality: number = 75): string {
  const widths = [640, 750, 828, 1080, 1200, 1920];

  return widths
    .map(w => `${getOptimizedImageUrl(src, w, quality)} ${w}w`)
    .join(', ');
}
