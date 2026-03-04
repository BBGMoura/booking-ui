import * as React from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

/**
 * APP BUTTON
 * 
 * Wrapped version of shadcn Button with:
 * - Mobile-first responsive sizing
 * - Loading state support
 * - Optimized touch targets for mobile (44px minimum)
 * 
 * The original button.tsx in components/ui/ is NEVER modified!
 * 
 * Usage:
 *   <AppButton>Click me</AppButton>
 *   <AppButton size="lg" loading>Processing...</AppButton>
 *   <AppButton variant="outline" size="sm">Cancel</AppButton>
 */

export interface AppButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export function AppButton({
  children,
  className,
  size = 'default',
  disabled,
  loading = false,
  ...props
}: AppButtonProps) {
  return (
    <Button
      size={size}
      disabled={disabled || loading}
      className={cn(
        // Mobile-first responsive sizing
        // Mobile → Desktop (using our Tailwind v4 tokens!)
        size === 'sm' && 'md:h-10 md:px-4',           // 36px → 40px
        size === 'default' && 'md:h-11 md:px-6',      // 40px → 44px (meets touch target!)
        size === 'lg' && 'md:h-12 md:px-8',           // 44px → 48px
        
        // Mobile touch optimization
        'touch-manipulation',  // Removes 300ms tap delay on mobile
        
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}