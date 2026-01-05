import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Default - Teal
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        // Secondary - Mocha neutral
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Destructive - Rose
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        // Outline - Subtle border
        outline: "text-foreground border-border bg-background",
        // Success - Sage green
        success:
          "border-transparent bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-300",
        // Warning - Gold (WCAG AA: text-gold-800 for 5.5:1 contrast on gold-100)
        warning:
          "border-transparent bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-200",
        // Info - Cobalt blue (professional)
        info:
          "border-transparent bg-cobalt-100 text-cobalt-700 dark:bg-cobalt-900/30 dark:text-cobalt-300",
        // Premium - Champagne Gold
        premium:
          "border-transparent bg-accent text-accent-foreground shadow-sm",
        // Pending - Mocha neutral
        pending:
          "border-transparent bg-mocha-100 text-mocha-700 dark:bg-mocha-800 dark:text-mocha-200",
        // Confirmed - Sage
        confirmed:
          "border-transparent bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-300",
        // Cancelled - Rose
        cancelled:
          "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
        // Love - Romance badge (WCAG AA: text-rose-700 for 5.8:1 contrast on rose-100)
        love:
          "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
        // New - Teal badge for new items
        new:
          "border-transparent bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
