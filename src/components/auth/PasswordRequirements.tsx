import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Represents a single password requirement with a label and a test function.
 */
interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: '8-16 characters', test: (p) => p.length >= 8 && p.length <= 16 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[!@#$£%^&+=?'~:;/.,*(){}]/.test(p) },
];

interface RequirementItemProps {
  label: string;
  met: boolean;
}

/**
 * Renders a single password requirement row with a tick or cross icon.
 * Met requirements use the primary colour, unmet use destructive.
 */
function RequirementItem({ label, met }: RequirementItemProps) {
  return (
    <li
      className={cn(
        'flex items-center gap-1.5 text-xs transition-colors',
        met ? 'text-primary' : 'text-destructive'
      )}
    >
      {met ? <Check size={12} /> : <X size={12} />}
      {label}
    </li>
  );
}

interface PasswordRequirementsProps {
  /** The current password value from the form — updated in real time as the user types */
  password: string;
}

/**
 * Displays a real-time checklist of password requirements.
 * Each requirement turns from destructive to primary as the user meets it.
 * Only shown when the user has started typing.
 */
export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {requirements.map(({ label, test }) => (
        <RequirementItem key={label} label={label} met={test(password)} />
      ))}
    </ul>
  );
}
