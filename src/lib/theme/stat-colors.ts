/**
 * Stat Card Color Definitions
 *
 * Consistent color palette for statistics cards across the dashboard.
 * Uses Tailwind color classes for consistency with the design system.
 */

// Full card styling with gradients and shadows
const fullCardStyle = (colors: {
  border: string;
  shadow: string;
  gradient: string;
  iconGradient: string;
  icon: string;
  value: string;
}) => ({
  borderColor: colors.border,
  shadowColor: colors.shadow,
  gradientBg: colors.gradient,
  iconGradient: colors.iconGradient,
  iconColor: colors.icon,
  valueGradient: colors.value,
});

export const STAT_CARD_COLORS = {
  // Semantic colors for stats-cards.tsx
  success: fullCardStyle({
    border: 'border-emerald-200/50 dark:border-emerald-800/30',
    shadow: 'shadow-emerald-100/50',
    gradient: 'from-emerald-50/80 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10',
    iconGradient: 'from-emerald-100 to-teal-100 dark:from-emerald-800/50 dark:to-teal-800/50',
    icon: 'text-emerald-600 dark:text-emerald-400',
    value: 'from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400',
  }),
  info: fullCardStyle({
    border: 'border-blue-200/50 dark:border-blue-800/30',
    shadow: 'shadow-blue-100/50',
    gradient: 'from-blue-50/80 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/10',
    iconGradient: 'from-blue-100 to-indigo-100 dark:from-blue-800/50 dark:to-indigo-800/50',
    icon: 'text-blue-600 dark:text-blue-400',
    value: 'from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400',
  }),
  primary: fullCardStyle({
    border: 'border-teal-200/50 dark:border-teal-800/30',
    shadow: 'shadow-teal-100/50',
    gradient: 'from-teal-50/80 to-cyan-50/50 dark:from-teal-900/20 dark:to-cyan-900/10',
    iconGradient: 'from-teal-100 to-cyan-100 dark:from-teal-800/50 dark:to-cyan-800/50',
    icon: 'text-teal-600 dark:text-teal-400',
    value: 'from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400',
  }),
  warning: fullCardStyle({
    border: 'border-amber-200/50 dark:border-amber-800/30',
    shadow: 'shadow-amber-100/50',
    gradient: 'from-amber-50/80 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/10',
    iconGradient: 'from-amber-100 to-yellow-100 dark:from-amber-800/50 dark:to-yellow-800/50',
    icon: 'text-amber-600 dark:text-amber-400',
    value: 'from-amber-600 to-yellow-600 dark:from-amber-400 dark:to-yellow-400',
  }),
  danger: fullCardStyle({
    border: 'border-rose-200/50 dark:border-rose-800/30',
    shadow: 'shadow-rose-100/50',
    gradient: 'from-rose-50/80 to-pink-50/50 dark:from-rose-900/20 dark:to-pink-900/10',
    iconGradient: 'from-rose-100 to-pink-100 dark:from-rose-800/50 dark:to-pink-800/50',
    icon: 'text-rose-600 dark:text-rose-400',
    value: 'from-rose-600 to-pink-600 dark:from-rose-400 dark:to-pink-400',
  }),
  neutral: fullCardStyle({
    border: 'border-stone-200/50 dark:border-stone-800/30',
    shadow: 'shadow-stone-100/50',
    gradient: 'from-stone-50/80 to-gray-50/50 dark:from-stone-900/20 dark:to-gray-900/10',
    iconGradient: 'from-stone-100 to-gray-100 dark:from-stone-800/50 dark:to-gray-800/50',
    icon: 'text-stone-600 dark:text-stone-400',
    value: 'from-stone-600 to-gray-600 dark:from-stone-400 dark:to-gray-400',
  }),
  // Legacy simple colors for backwards compatibility
  revenue: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    border: 'border-emerald-200',
  },
  transactions: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-blue-200',
  },
  email: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    border: 'border-purple-200',
  },
  sms: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    border: 'border-amber-200',
  },
  clients: {
    bg: 'bg-rose-50',
    icon: 'text-rose-600',
    border: 'border-rose-200',
  },
  average: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    border: 'border-indigo-200',
  },
  guests: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
    border: 'border-cyan-200',
  },
  events: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    border: 'border-orange-200',
  },
  budget: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    border: 'border-green-200',
  },
  vendors: {
    bg: 'bg-violet-50',
    icon: 'text-violet-600',
    border: 'border-violet-200',
  },
  default: {
    bg: 'bg-gray-50',
    icon: 'text-gray-600',
    border: 'border-gray-200',
  },
} as const;

export type StatCardColorKey = keyof typeof STAT_CARD_COLORS;
