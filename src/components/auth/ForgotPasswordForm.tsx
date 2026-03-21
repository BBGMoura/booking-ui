'use client';

import { z } from 'zod';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircleIcon, MailCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { parseApiError } from '@/lib/utils/errorUtils';
import { resetPassword } from '@/lib/api/auth';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onResetPassword?: (email: string) => Promise<void>;
}

export default function ForgotPasswordForm({ onResetPassword = resetPassword }: ForgotPasswordFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      await onResetPassword(values.email);
      setSubmitted(true);
    } catch (exception) {
      form.setError('root', { message: parseApiError(exception) });
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center pt-8 text-center">
          <MailCheckIcon className="mb-4 h-14 w-14 text-green-500" />
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            We&apos;ve sent a new password to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-gray-500">
            If an account exists for that email, you will receive a new password shortly.
          </p>
        </CardContent>
        <CardFooter className="border-t">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center pt-8 text-center">
        {/* TODO Update with logo in future ticket */}
        <img
          src="https://alignui.com/images/logo/aurora.svg"
          alt="Logo"
          className="mb-4 h-14 w-14"
        />
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a new password.
        </CardDescription>
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
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  placeholder="you@example.com"
                  autoFocus
                  autoComplete="email"
                  disabled={isLoading}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner />
                Sending...
              </>
            ) : (
              'Send reset email'
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
