import { RegisterForm } from '@/features/auth/components/register-form';
import { AuthLayout } from '@/layouts/auth-layout';

export function RegisterPage() {
  return (
    <AuthLayout
      wide
      title="Register as an organ donor"
      description="Your registration records your decision to donate. You can update your details or request to withdraw at any time."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
