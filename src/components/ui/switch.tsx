"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default - Teal (primary action)
        default: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-ring",
        // Rose - Romance toggle
        rose: "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-rose-400 data-[state=checked]:to-rose-600 data-[state=checked]:shadow-rose-500/25 data-[state=unchecked]:bg-mocha-200 dark:data-[state=unchecked]:bg-mocha-700 focus-visible:ring-rose-500/50",
        // Glass - Cloud Dancer aesthetic
        glass: "data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-white/10 backdrop-blur-sm border-white/20 focus-visible:ring-white/50",
        // Success - Sage green
        success: "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-sage-400 data-[state=checked]:to-sage-600 data-[state=unchecked]:bg-mocha-200 dark:data-[state=unchecked]:bg-mocha-700 focus-visible:ring-sage-500/50",
        // Gold - Celebration/premium toggle
        gold: "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-gold-400 data-[state=checked]:to-gold-600 data-[state=checked]:shadow-gold-500/25 data-[state=unchecked]:bg-mocha-200 dark:data-[state=unchecked]:bg-mocha-700 focus-visible:ring-gold-500/50",
        // Teal - Explicit teal gradient
        teal: "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-400 data-[state=checked]:to-teal-600 data-[state=checked]:shadow-teal-500/25 data-[state=unchecked]:bg-mocha-200 dark:data-[state=unchecked]:bg-mocha-700 focus-visible:ring-teal-500/50",
      },
      size: {
        default: "h-5 w-9",
        sm: "h-4 w-7",
        lg: "h-6 w-11",
        // Touch-friendly (GenZ mobile-first)
        touch: "h-7 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const thumbVariants = cva(
  "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-all duration-300",
  {
    variants: {
      size: {
        default: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        sm: "h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0",
        lg: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        touch: "h-6 w-6 data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, variant, size, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(switchVariants({ variant, size }), className)}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className={cn(thumbVariants({ size }))} />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch, switchVariants }
