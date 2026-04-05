'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertCircleIcon, Loader2 } from 'lucide-react';
import { updateCredentials } from '@/lib/api/user';
import { parseApiError } from '@/lib/utils/errorUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import PasswordRequirements from '@/components/auth/PasswordRequirements';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$£%^&+=?'~:;/.,*(){}]).{8,16}$/,
        'Password must be 8-16 characters with 1 uppercase, 1 lowercase, 1 number and 1 special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = form.watch('password');

  async function onSubmit(values: ChangePasswordFormValues) {
    setIsLoading(true);
    try {
      await updateCredentials({ password: values.password });
      toast.success('Password updated successfully');
      form.reset();
    } catch (error) {
      form.setError('root', { message: parseApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Choose a strong password with at least 8 characters</CardDescription>
      </CardHeader>
      <CardContent>
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-sm space-y-4" noValidate>
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  disabled={isLoading}
                  aria-invalid={fieldState.invalid}
                />
                <PasswordRequirements password={password} />
              </Field>
            )}
          />

          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Confirm new password</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  disabled={isLoading}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
