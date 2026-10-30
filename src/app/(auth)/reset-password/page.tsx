'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

/**
 * Reset password page — reads the token from the emailed link's query string
 * and renders ResetPasswordForm, which owns all the actual logic.
 *
 * Wrapped in Suspense because useSearchParams() requires it.
 */
function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  return <ResetPasswordForm token={searchParams.get('token')} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
