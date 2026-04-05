'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, PencilLine } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { updateUserInfo } from '@/lib/api/user';
import { parseApiError } from '@/lib/utils/errorUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';

const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'Max 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Max 50 characters'),
  phoneNumber: z
    .string()
    .regex(/^0\d{9,10}$/, 'Phone number must start with 0 and be 10-11 digits (e.g. 07112233445)'),
});

type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;

function ProfileField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function PersonalInfoForm() {
  const { user, fetchUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phoneNumber: user?.phoneNumber ?? '',
    },
  });

  function handleCancel() {
    form.reset();
    setIsEditing(false);
  }

  async function onSubmit(values: PersonalInfoFormValues) {
    setIsLoading(true);
    try {
      await updateUserInfo(values);
      await fetchUser();
      toast.success('Personal information updated');
      setIsEditing(false);
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-0">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>Personal Information</CardTitle>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <PencilLine className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
        <CardDescription>View and edit your personal information.</CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="firstName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>First name</FieldLabel>
                    <Input {...field} id={field.name} disabled={isLoading} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="lastName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Last name</FieldLabel>
                    <Input {...field} id={field.name} disabled={isLoading} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="phoneNumber"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Phone number</FieldLabel>
                  <Input {...field} id={field.name} disabled={isLoading} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input value={user?.email ?? ''} disabled />
              <p className="text-muted-foreground text-xs">Email cannot be changed</p>
            </Field>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <ProfileField label="First name" value={user?.firstName} />
            <ProfileField label="Last name" value={user?.lastName} />
            <ProfileField label="Email" value={user?.email} />
            <ProfileField label="Phone number" value={user?.phoneNumber} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
