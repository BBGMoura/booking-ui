import LoginForm from '@/components/auth/LoginForm';

/**
 * Login page — renders the LoginForm component.
 * Kept intentionally minimal — all logic lives in LoginForm.
 * Layout (centering, background) handled by (auth)/layout.tsx.
 */
export default function LoginPage() {
  return <LoginForm />;
}
