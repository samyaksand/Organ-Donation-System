import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { ApiError, errorMessage } from '@/api/client';
import { FormField } from '@/components/common/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { homePathFor } from '../session';
import { useLogin } from '../hooks';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type Values = z.infer<typeof schema>;

export function LoginForm({ portal }: { portal: 'DONOR' | 'ADMIN' }) {
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await login.mutateAsync({ ...values, portal });
      const from = (location.state as { from?: string } | null)?.from;
      const home = homePathFor(user.role);
      toast.success(`Welcome back${user.donor ? `, ${user.donor.firstName}` : user.admin ? `, ${user.admin.displayName}` : ''}`);
      navigate(from?.startsWith(home) ? from : home, { replace: true });
    } catch {
      form.setFocus('password');
    }
  });

  const serverError = login.error;
  const invalidCredentials = serverError instanceof ApiError && serverError.code === 'INVALID_CREDENTIALS';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>{invalidCredentials ? 'Sign-in failed' : 'Something went wrong'}</AlertTitle>
          <AlertDescription>
            {invalidCredentials
              ? `The email or password is incorrect${portal === 'ADMIN' ? ', or this is not an administrator account' : ''}.`
              : errorMessage(serverError)}
          </AlertDescription>
        </Alert>
      )}

      <FormField label="Email" error={errors.email?.message} required>
        {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...form.register('email')} />}
      </FormField>

      <FormField label="Password" error={errors.password?.message} required>
        {(p) => (
          <div className="relative">
            <Input
              {...p}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-10"
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        )}
      </FormField>

      <Button type="submit" className="w-full" loading={login.isPending}>
        {!login.isPending && <LogIn aria-hidden="true" />}
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
