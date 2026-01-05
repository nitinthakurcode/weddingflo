"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden",
  {
    variants: {
      variant: {
        default: "rounded-full",
        // Ring variants - 2026 palette
        ring: "rounded-full ring-2 ring-offset-2 ring-offset-background ring-teal-300 dark:ring-teal-700",
        // Rose ring for romance
        "ring-rose": "rounded-full ring-2 ring-offset-2 ring-offset-background ring-rose-300 dark:ring-rose-700",
        // Celebration gradient ring
        "ring-gradient": "rounded-full p-0.5 bg-gradient-to-br from-gold-400 via-rose-400 to-teal-400",
        // Soft rounded square
        square: "rounded-2xl",
        // Rounded corners
        rounded: "rounded-xl",
        // Glass effect - Cloud Dancer aesthetic
        glass: "rounded-full ring-2 ring-white/30 backdrop-blur-sm",
        // Premium gold ring
        "ring-gold": "rounded-full ring-2 ring-offset-2 ring-offset-background ring-gold-400 dark:ring-gold-600",
      },
      size: {
        default: "h-10 w-10",
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
        "2xl": "h-20 w-20",
        "3xl": "h-24 w-24",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, variant, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ variant, size }), className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover rounded-[inherit]", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center rounded-[inherit]",
  {
    variants: {
      variant: {
        default: "bg-muted",
        // 2026 Gradient fallbacks
        rose: "bg-gradient-to-br from-rose-400 to-rose-600 text-white",
        teal: "bg-gradient-to-br from-teal-400 to-teal-600 text-white",
        gold: "bg-gradient-to-br from-gold-400 to-gold-600 text-white",
        sage: "bg-gradient-to-br from-sage-400 to-sage-600 text-white",
        cobalt: "bg-gradient-to-br from-cobalt-400 to-cobalt-600 text-white",
        mocha: "bg-gradient-to-br from-mocha-400 to-mocha-600 text-white",
        glass: "bg-white/20 backdrop-blur-sm text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>,
    VariantProps<typeof avatarFallbackVariants> {}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, variant, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(avatarFallbackVariants({ variant }), className)}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// Avatar Group for stacking avatars
interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max, ...props }, ref) => {
    const childArray = React.Children.toArray(children)
    const visibleChildren = max ? childArray.slice(0, max) : childArray
    const remaining = max ? childArray.length - max : 0

    return (
      <div
        ref={ref}
        className={cn("flex -space-x-3", className)}
        {...props}
      >
        {visibleChildren}
        {remaining > 0 && (
          <Avatar variant="default" size="default" className="border-2 border-background">
            <AvatarFallback variant="teal" className="text-xs font-semibold">
              +{remaining}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    )
  }
)
AvatarGroup.displayName = "AvatarGroup"

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, avatarVariants, avatarFallbackVariants }
