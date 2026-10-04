import { Link } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/login-form';
import { AuthLayout } from '@/layouts/auth-layout';

export function DonorLoginPage() {
  return (
    <AuthLayout
      title="Donor sign in"
      description="Access your donor account, organ records and withdrawal requests."
      footer={
        <div className="space-y-2">
          <p>
            New here?{' '}
            <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Register as a donor
            </Link>
          </p>
          <p>
            Hospital administrator?{' '}
            <Link to="/admin/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Administrator sign in
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm portal="DONOR" />
    </AuthLayout>
  );
}
