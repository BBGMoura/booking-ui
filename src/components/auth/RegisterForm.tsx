'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Stepper from '@/components/ui/Stepper';
import RegisterEmailForm from '@/components/auth/RegisterEmailForm';
import RegisterDetailsForm from '@/components/auth/RegisterDetailsForm';

// The two step labels shown in the stepper
// Defined outside the component so it's not recreated on every render
const STEPS = ['Email check', 'Your details'];

/**
 * RegisterForm — the full registration screen.
 * Owns the step state and email between steps.
 * Renders the card, logo, stepper and the correct form for each step.
 *
 * Step 1: RegisterEmailForm — checks if the email has been invited
 * Step 2: RegisterDetailsForm — collects user info (BMS-8)
 */
export default function RegisterForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [invitedEmail, setInvitedEmail] = useState('');

  function handleEmailSuccess(email: string) {
    setInvitedEmail(email);
    setCurrentStep(2);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-col items-center pt-8 text-center">
        {/* TODO: Replace with real logo before production */}
        <img
          src="https://alignui.com/images/logo/aurora.svg"
          alt="Logo"
          className="mb-4 h-14 w-14"
        />
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Register to start booking classes</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Stepper steps={STEPS} currentStep={currentStep} />

        {currentStep === 1 && <RegisterEmailForm onSuccess={handleEmailSuccess} />}

        {currentStep === 2 && <RegisterDetailsForm email={invitedEmail} />}
      </CardContent>
    </Card>
  );
}
