"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full",
  {
    variants: {
      variant: {
        default: "bg-primary/20",
        // Teal track (primary)
        teal: "bg-teal-100 dark:bg-teal-950/30",
        // Rose track
        rose: "bg-rose-100 dark:bg-rose-950/30",
        // Gold track (celebration)
        gold: "bg-gold-100 dark:bg-gold-950/30",
        // Glass track
        glass: "bg-white/10 backdrop-blur-sm",
        // Subtle track
        subtle: "bg-muted",
      },
      size: {
        default: "h-2",
        sm: "h-1",
        lg: "h-3",
        xl: "h-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const progressIndicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        // Default - Teal (primary action)
        default: "bg-primary",
        // Teal gradient
        teal: "bg-gradient-to-r from-teal-400 to-teal-600",
        // Rose gradient (romance)
        rose: "bg-gradient-to-r from-rose-400 to-rose-600",
        // Gold gradient (celebration/achievement)
        gold: "bg-gradient-to-r from-gold-400 to-gold-600",
        // Sage gradient (success)
        sage: "bg-gradient-to-r from-sage-400 to-sage-600",
        // Cobalt gradient (professional)
        cobalt: "bg-gradient-to-r from-cobalt-400 to-cobalt-600",
        // Celebration gradient (dopamine trigger)
        celebration: "bg-gradient-to-r from-gold-400 via-rose-400 to-gold-500",
        // Glow effect with teal
        glow: "bg-gradient-to-r from-teal-400 to-teal-600 shadow-[0_0_10px_rgba(20,184,166,0.5)]",
        // Gold glow (achievement)
        "gold-glow": "bg-gradient-to-r from-gold-400 to-gold-600 shadow-[0_0_10px_rgba(212,168,83,0.5)]",
        // Animated shimmer
        shimmer: "bg-gradient-to-r from-teal-400 via-gold-300 to-teal-400 bg-[length:200%_100%] animate-shimmer",
      },
      animated: {
        true: "animate-pulse",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      animated: false,
    },
  }
)

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  indicatorClassName?: string
  indicatorVariant?: VariantProps<typeof progressIndicatorVariants>["variant"]
  animated?: boolean
  showValue?: boolean
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, variant, size, indicatorVariant, animated, showValue, ...props }, ref) => (
  <div className="relative">
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(progressVariants({ variant, size }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          progressIndicatorVariants({
            variant: indicatorVariant || (variant === "teal" ? "teal" : variant === "rose" ? "rose" : variant === "gold" ? "gold" : "default"),
            animated
          }),
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
    {showValue && (
      <span className="absolute right-0 -top-6 text-xs font-medium text-muted-foreground">
        {Math.round(value || 0)}%
      </span>
    )}
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

// Circular Progress - 2026 Design System
interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  size?: "sm" | "default" | "lg"
  strokeWidth?: number
  showValue?: boolean
  variant?: "default" | "teal" | "rose" | "gold" | "sage" | "cobalt"
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ value, size = "default", strokeWidth = 4, showValue = true, variant = "teal", className, ...props }, ref) => {
    const sizes = {
      sm: 32,
      default: 48,
      lg: 64,
    }
    const svgSize = sizes[size]
    const radius = (svgSize - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (value / 100) * circumference

    // 2026 color palette gradients for SVG (requires hex values)
    // These match the CSS variables in src/styles/tokens/colors.css
    // SVG gradient stops don't support CSS variables, so hex values are required
    const gradientColors: Record<string, [string, string]> = {
      default: ["#14B8A6", "#0D9488"], // Teal (--teal-500, --teal-600)
      teal: ["#2DD4BF", "#0D9488"],    // Teal (--teal-400, --teal-600)
      rose: ["#FB7185", "#E11D48"],    // Rose (--rose-400, --rose-500)
      gold: ["#FACC15", "#B8923E"],    // Gold (--gold-400, --gold-600)
      sage: ["#7BAF6B", "#467C38"],    // Sage (--sage-400, --sage-600)
      cobalt: ["#60A5FA", "#1D4ED8"],  // Cobalt (--cobalt-400, --cobalt-600)
    }

    const colors = gradientColors[variant] || gradientColors.default

    return (
      <div ref={ref} className={cn("relative inline-flex", className)} {...props}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <defs>
            <linearGradient id={`progress-gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors[0]} />
              <stop offset="100%" stopColor={colors[1]} />
            </linearGradient>
          </defs>
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-muted/20"
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke={`url(#progress-gradient-${variant})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {showValue && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
            {Math.round(value)}%
          </span>
        )}
      </div>
    )
  }
)
CircularProgress.displayName = "CircularProgress"

export { Progress, CircularProgress, progressVariants, progressIndicatorVariants }
