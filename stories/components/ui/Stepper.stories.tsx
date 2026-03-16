import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Stepper from '@/components/ui/Stepper';

const meta: Meta<typeof Stepper> = {
  title: 'UI/Stepper',
  component: Stepper,
  parameters: {
    layout: 'centered',
  },
  args: {
    steps: ['Email check', 'Your details'],
  },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

/** Step 1 active — default state when user first lands on register */
export const StepOne: Story = {
  args: {
    currentStep: 1,
  },
};

/** Step 2 active — after email check passes, step 1 shows as completed */
export const StepTwo: Story = {
  args: {
    currentStep: 2,
  },
};
