'use client';

import { z } from 'zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { inviteUser } from '@/lib/api/user';
import { USER_ROLES } from '@/lib/types/auth';
import {
  getApiErrorInfo,
  isFieldValidationError,
  parseApiError,
  setFieldErrors,
} from '@/lib/utils/errorUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { DIALOG_FULL_WIDTH_ON_PHONE } from '@/lib/utils/dialog';
import { Switch } from '@/components/ui/switch';

// The same email rule as registration.
const inviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  role: z.enum([USER_ROLES.USER, USER_ROLES.ADMIN]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
}

/** Dialog for inviting someone by email, as a User or an Admin. */
export function InviteUserDialog({ open, onOpenChange, onInvited }: InviteUserDialogProps) {
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { email: '', role: USER_ROLES.USER },
  });
  const [submitting, setSubmitting] = useState(false);
  const rootError = form.formState.errors.root?.message;

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) form.reset();
    onOpenChange(next);
  }

  async function onSubmit(values: InviteFormValues) {
    setSubmitting(true);
    try {
      await inviteUser({ email: values.email, role: values.role });
      toast.success(`Invite sent to ${values.email}`);
      form.reset();
      onOpenChange(false);
      onInvited();
    } catch (exception) {
      if (isFieldValidationError(exception)) {
        setFieldErrors(exception.response!.data.details, form.setError, ['email', 'role']);
      } else if (getApiErrorInfo(exception).status === 400) {
        // e.g. "User with email … is already invited."
        form.setError('email', { type: 'server', message: parseApiError(exception) });
      } else {
        form.setError('root', { message: parseApiError(exception) });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={DIALOG_FULL_WIDTH_ON_PHONE}>
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>An invitation will be sent to this email address.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {rootError && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          )}

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="invite-email"
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="off"
                  disabled={submitting}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="role"
            control={form.control}
            render={({ field }) => (
              <FieldLabel htmlFor="invite-admin" className="border-dashed">
                <Field className="gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <FieldTitle id="invite-admin-label">Admin</FieldTitle>
                    <Switch
                      id="invite-admin"
                      aria-labelledby="invite-admin-label"
                      aria-describedby="invite-admin-hint"
                      checked={field.value === USER_ROLES.ADMIN}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? USER_ROLES.ADMIN : USER_ROLES.USER)
                      }
                      disabled={submitting}
                    />
                  </div>
                  <FieldDescription id="invite-admin-hint">
                    Can manage users, floor fees and everyone&apos;s bookings.
                  </FieldDescription>
                </Field>
              </FieldLabel>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner />
                  Sending...
                </>
              ) : (
                'Send invite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
