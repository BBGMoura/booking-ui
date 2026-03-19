import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isFieldValidationError, parseApiError, setFieldErrors } from '@/lib/utils/errorUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import PasswordRequirements from '@/components/auth/PasswordRequirements';

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must be at most 50 characters'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be at most 50 characters'),
    phoneNumber: z
      .string()
      .min(1, 'Phone number is required')
      .regex(
        /^0\d{9,10}$/,
        'Phone number must start with 0 and be 10-11 digits (e.g. 07112233445)'
      ),
    password: z
      .string()
      .min(1, 'Password is required')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$£%^&+=?'~:;/.,*(){}]).{8,16}$/,
        'Password must be 8-16 characters and contain uppercase, lowercase, number and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password == data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterDetailsFormValues = z.infer<typeof registerSchema>;

interface RegisterDetailsFormProps {
  email: string;
}

/**
 * Registration step 2 — collects user details and creates the account.
 * Receives the invited email from step 1 as a prop.
 * On success, redirects to /dashboard.
 */
export default function RegisterDetailsForm({ email }: RegisterDetailsFormProps) {
  const { register, isLoading } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterDetailsFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = form.watch('password');

  function handleRegisterError(exception: unknown) {
    if (isFieldValidationError(exception)) {
      setFieldErrors(exception.response!.data, form.setError, [
        'firstName',
        'lastName',
        'phoneNumber',
        'password',
      ]);
    } else {
      form.setError('root', { message: parseApiError(exception) });
    }
  }

  async function onSubmit(values: RegisterDetailsFormValues) {
    try {
      await register({
        firstName: values.firstName,
        lastName: values.lastName,
        email,
        phoneNumber: values.phoneNumber,
        password: values.password,
      });
      router.push('/dashboard');
    } catch (exception) {
      handleRegisterError(exception);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Registration Error</AlertTitle>
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      )}

      {/* Email — pre-filled from step 1, disabled */}
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" type="email" value={email} disabled autoComplete="email" />
      </Field>

      {/* First name */}
      <Controller
        name="firstName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>First name</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type="text"
              placeholder="Jane"
              autoFocus
              autoComplete="given-name"
              disabled={isLoading}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Last name */}
      <Controller
        name="lastName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Last name</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type="text"
              placeholder="Doe"
              autoComplete="family-name"
              disabled={isLoading}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Phone number */}
      <Controller
        name="phoneNumber"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Phone number</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type="tel"
              placeholder="07112233445"
              autoComplete="tel"
              disabled={isLoading}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Password */}
      <Controller
        name="password"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Password</FieldLabel>
            <div className="relative">
              <Input
                {...field}
                id={field.name}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
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
            <PasswordRequirements password={password} />
            {fieldState.invalid && !password && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Confirm password */}
      <Controller
        name="confirmPassword"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
            <div className="relative">
              <Input
                {...field}
                id={field.name}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={isLoading}
                aria-invalid={fieldState.invalid}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Spinner />
            Creating account...
          </>
        ) : (
          'Create account'
        )}
      </Button>

      {/* Sign in link */}
      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
