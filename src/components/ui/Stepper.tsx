import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StepperProps — props for the main Stepper component.
 *
 * @param steps - Array of step labels e.g. ['Email check', 'Your details']
 * @param currentStep - Which step is currently active, 1-based (so 1 = first step, 2 = second step)
 */
interface StepperProps {
  steps: string[];
  currentStep: number;
}

/**
 * StepProps — props for the internal Step component.
 *
 * @param label - The text shown below the circle e.g. 'Email check'
 * @param stepNumber - The number shown inside the circle e.g. 1, 2
 * @param isCompleted - True if this step has already been finished (step number < currentStep)
 * @param isActive - True if this is the step the user is currently on (step number === currentStep)
 * @param isLast - True if this is the final step — used to skip drawing the connector line after it
 */
interface StepProps {
  label: string;
  stepNumber: number;
  isCompleted: boolean;
  isActive: boolean;
  isLast: boolean;
}

/**
 * Step — renders a single step in the stepper.
 *
 * There are three visual states:
 * - Active: filled primary circle with the step number — the step the user is on right now
 * - Completed: filled primary circle with a tick — a step the user has already passed
 * - Upcoming: grey circle with the step number — a step the user hasn't reached yet
 *
 * If this isn't the last step, a horizontal connector line is drawn after the circle.
 * The line is primary coloured when the step is completed, grey otherwise.
 *
 */
function Step({ label, stepNumber, isCompleted, isActive, isLast }: StepProps) {
  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
            isCompleted || isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isCompleted ? <Check size={16} /> : stepNumber}
        </div>

        <span
          className={cn(
            'text-xs font-medium',
            isCompleted || isActive ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
      </div>
      {!isLast && (
        <div
          className={cn(
            'mx-3 mb-5 h-px w-16 transition-colors',
            isCompleted ? 'bg-primary' : 'bg-border'
          )}
        />
      )}
    </div>
  );
}

/**
 * Stepper — renders a horizontal row of steps showing progress through a multistep flow.
 *
 * How it works:
 * - Loops over the steps array and renders a Step for each one
 * - Passes down whether each step is completed, active, or upcoming based on currentStep
 * - The Step component handles all the visual rendering
 *
 * Usage:
 * const STEPS = ['Email check', 'Your details'];
 * <Stepper steps={STEPS} currentStep={1} /> — step 1 active, step 2 upcoming
 * <Stepper steps={STEPS} currentStep={2} /> — step 1 completed, step 2 active
 */
export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-center">
      {steps.map((step, index) => (
        <Step
          key={step}
          label={step}
          stepNumber={index + 1}
          isCompleted={index + 1 < currentStep}
          isActive={index + 1 === currentStep}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
}
