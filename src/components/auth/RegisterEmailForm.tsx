'use client';

import { z } from 'zod';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkInvite } from '@/lib/api/auth';
import { parseApiError } from '@/lib/utils/errorUtils';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface RegisterEmailFormProps {
  onSuccess: (email: string) => void;
}

/**
 * Registration step 1 — checks whether the entered email has been invited.
 * On success, calls onSuccess(email) so the parent can advance to step 2.
 */
export default function RegisterEmailForm({ onSuccess }: RegisterEmailFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  async function onSubmit(values: EmailFormValues) {
    try {
      setError(null);
      setIsLoading(true);
      const response = await checkInvite(values.email);

      if (!response.invited) {
        setError('This email has not been invited. Please contact an administrator.');
        return;
      }

      onSuccess(values.email);
    } catch (exception) {
      setError(parseApiError(exception));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Registration Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
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
            Checking...
          </>
        ) : (
          'Continue'
        )}
      </Button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
