'use client';

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Transformative Teal (2026)
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        // Destructive - Rose
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg",
        // Outline - Teal interaction
        outline:
          "border border-input bg-background shadow-sm hover:bg-primary/5 hover:text-primary hover:border-primary/50 dark:hover:bg-primary/10",
        // Secondary - Mocha warm neutral
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        // Ghost - Subtle teal hover
        ghost: "hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20",
        // Link - Teal underline
        link: "text-primary underline-offset-4 hover:underline",
        // Premium - Champagne Gold (dopamine trigger)
        premium:
          "bg-accent text-accent-foreground shadow-md hover:bg-accent/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        // Success - Sage green
        success:
          "bg-sage-600 text-white shadow-md hover:bg-sage-700 hover:shadow-lg dark:bg-sage-500 dark:hover:bg-sage-600",
        // Celebrate - Gold gradient (dopamine trigger for achievements)
        celebrate:
          "bg-gradient-to-r from-gold-400 to-rose-400 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
        // Aura - Teal to Gold gradient
        aura:
          "bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
        // Glass - Frosted glass effect
        glass:
          "bg-white/10 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/10",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        xl: "h-12 rounded-lg px-10 text-base font-semibold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
