import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/login-form';
import { AuthLayout } from '@/layouts/auth-layout';

export function AdminLoginPage() {
  return (
    <AuthLayout
      title="Administrator sign in"
      description="Restricted to hospital and registry administrators."
      footer={
        <p>
          Are you a donor?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Donor sign in
          </Link>
        </p>
      }
    >
      <div className="mb-5 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Administrator accounts are created by the system operator. There is no public sign-up.
      </div>
      <LoginForm portal="ADMIN" />
    </AuthLayout>
  );
}
