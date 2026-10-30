'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

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
