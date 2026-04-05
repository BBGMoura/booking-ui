import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PersonalInfoForm } from '@/components/profile/PersonalInfoForm';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <ProfileHeader />
      <PersonalInfoForm />
      <ChangePasswordForm />
    </div>
  );
}
