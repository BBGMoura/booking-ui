import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * TYPOGRAPHY COMPONENTS
 * 
 * Semantic components for consistent typography across the app.
 * All components are mobile-first and automatically responsive.
 * 
 * Usage:
 *   <H1>Page Title</H1>
 *   <Body>Paragraph text</Body>
 */

interface TypographyProps {
  children: React.ReactNode
  className?: string
}

// ===== HEADINGS =====

export function H1({ children, className }: TypographyProps) {
  return (
    <h1
      className={cn(
        'text-2xl font-bold tracking-tight',
        'md:text-4xl',  // Desktop: bigger
        'text-foreground',
        className
      )}
    >
      {children}
    </h1>
  )
}

export function H2({ children, className }: TypographyProps) {
  return (
    <h2
      className={cn(
        'text-xl font-semibold tracking-tight',
        'md:text-2xl',
        'text-foreground',
        className
      )}
    >
      {children}
    </h2>
  )
}

export function H3({ children, className }: TypographyProps) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold',
        'md:text-xl',
        'text-foreground',
        className
      )}
    >
      {children}
    </h3>
  )
}

// ===== BODY TEXT =====

export function Body({ children, className }: TypographyProps) {
  return (
    <p
      className={cn(
        'text-sm leading-relaxed',
        'md:text-base',
        'text-foreground',
        className
      )}
    >
      {children}
    </p>
  )
}

export function BodyLarge({ children, className }: TypographyProps) {
  return (
    <p
      className={cn(
        'text-base leading-relaxed',
        'md:text-lg',
        'text-foreground',
        className
      )}
    >
      {children}
    </p>
  )
}

// ===== SMALL TEXT =====

export function Small({ children, className }: TypographyProps) {
  return (
    <small
      className={cn(
        'text-xs',
        'md:text-sm',
        'text-muted-foreground',
        className
      )}
    >
      {children}
    </small>
  )
}

// ===== SPECIALIZED =====

export function Label({ children, className }: TypographyProps) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        'md:text-base',
        'text-foreground',
        className
      )}
    >
      {children}
    </label>
  )
}