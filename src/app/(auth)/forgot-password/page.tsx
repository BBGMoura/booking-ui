import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

/**
 * Forgot password page — renders the ForgotPasswordForm component.
 * Kept intentionally minimal — all logic lives in ForgotPasswordForm.
 * Layout (centering, background) handled by (auth)/layout.tsx.
 */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
