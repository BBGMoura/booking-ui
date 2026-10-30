'use client';

import { z } from 'zod';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircleIcon, Eye, EyeOff, KeyRoundIcon, CheckCircle2Icon } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isForbiddenError, parseApiError } from '@/lib/utils/errorUtils';
import { confirmPasswordReset } from '@/lib/api/auth';
import PasswordRequirements from '@/components/auth/PasswordRequirements';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, 'Password is required')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$£%^&+=?'~:;/.,*(){}]).{8,16}$/,
        'Password must be 8-16 characters and contain uppercase, lowercase, number and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  /** The token read from the emailed reset link's query string, or null if missing. */
  token: string | null;
  onConfirmPasswordReset?: (token: string, newPassword: string) => Promise<void>;
}

/**
 * Renders one of three states:
 * - No token (or an invalid/expired one, discovered on submit) → a dead-end card
 *   pointing back to /forgot-password
 * - Default → the new-password form
 * - After a successful submit → a confirmation card pointing to /login
 */
export default function ResetPasswordForm({
  token,
  onConfirmPasswordReset = confirmPasswordReset,
}: ResetPasswordFormProps) {
  const [linkInvalid, setLinkInvalid] = useState(!token);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const newPassword = form.watch('newPassword');

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return;

    setIsLoading(true);
    try {
      await onConfirmPasswordReset(token, values.newPassword);
      setSubmitted(true);
    } catch (exception) {
      if (isForbiddenError(exception)) {
        setLinkInvalid(true);
      } else {
        form.setError('root', { message: parseApiError(exception) });
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (linkInvalid) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center pt-8 text-center">
          <KeyRoundIcon className="text-destructive mb-4 h-14 w-14" />
          <CardTitle>Invalid reset link</CardTitle>
          <CardDescription>This password reset link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardFooter className="border-t">
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request new link</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center pt-8 text-center">
          <CheckCircle2Icon className="mb-4 h-14 w-14 text-green-500" />
          <CardTitle>Password updated</CardTitle>
          <CardDescription>Your password has been reset successfully.</CardDescription>
        </CardHeader>
        <CardFooter className="border-t">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center pt-8 text-center">
        {/* TODO: replace with real logo */}
        <img
          src="https://alignui.com/images/logo/aurora.svg"
          alt="Logo"
          className="mb-4 h-14 w-14"
        />
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}

          <Controller
            name="newPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    autoComplete="new-password"
                    disabled={isLoading}
                    aria-invalid={fieldState.invalid}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordRequirements password={newPassword} />
                {fieldState.invalid && !newPassword && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Confirm new password</FieldLabel>
                <div className="relative">
                  <Input
                    {...field}
                    id={field.name}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isLoading}
                    aria-invalid={fieldState.invalid}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner />
                Resetting...
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="border-t">
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
