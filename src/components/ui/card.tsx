import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border text-card-foreground",
  {
    variants: {
      variant: {
        // Default - Clean white on warm Cloud background
        default: "bg-card shadow-sm border-border/60",
        // Elevated - More prominent with subtle depth
        elevated: "bg-card shadow-md hover:shadow-lg transition-shadow duration-200",
        // Premium - Luxury gradient (Cloud to Mocha hints)
        premium: "bg-gradient-to-br from-white via-cloud-50 to-cloud-100 border-cloud-200/60 shadow-md dark:from-mocha-900 dark:via-mocha-800 dark:to-mocha-900 dark:border-mocha-700/40",
        // Hero - Feature card with teal accent
        hero: "bg-gradient-to-br from-white via-teal-50/30 to-gold-50/20 border-teal-200/30 shadow-lg dark:from-mocha-900 dark:via-teal-950/20 dark:to-gold-950/10 dark:border-teal-800/20",
        // Glass - Modern glass morphism
        glass: "bg-white/80 backdrop-blur-xl border-white/40 shadow-lg dark:bg-mocha-900/80 dark:border-white/10",
        // Glass Strong - More opaque glass effect
        "glass-strong": "bg-white/90 backdrop-blur-2xl border-white/50 shadow-xl dark:bg-mocha-900/90 dark:border-white/15",
        // Accent - With champagne gold accent border
        accent: "bg-card border-l-4 border-l-accent shadow-sm",
        // Success - Sage green accent
        success: "bg-card border-l-4 border-l-sage-500 shadow-sm",
        // Warning - Gold accent
        warning: "bg-card border-l-4 border-l-gold-500 shadow-sm",
        // Destructive - Rose accent
        destructive: "bg-card border-l-4 border-l-rose-500 shadow-sm",
        // Interactive - Hover effects for clickable cards
        interactive: "bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer",
        // Celebration - Special card with gold glow (use sparingly)
        celebration: "bg-gradient-to-br from-gold-50 to-rose-50 border-gold-200 shadow-lg dark:from-gold-950/30 dark:to-rose-950/20 dark:border-gold-800/30",
      },
      size: {
        default: "",
        compact: "",
        sm: "",
        lg: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
