import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const {
    forgotPassword,
    forgotPasswordError,
    isForgotPasswordPending,
    isForgotPasswordSuccess,
  } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  function onSubmit(data: ForgotPasswordFormValues) {
    forgotPassword(data);
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Trackly</h1>
        <p className="text-sm text-gray-500">Reset your password</p>
      </div>

      {isForgotPasswordSuccess ? (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-success-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            We&apos;ve sent a password reset link to your email address. Please
            check your inbox and follow the instructions.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          {/* Error */}
          {forgotPasswordError && (
            <div className="mb-6 p-3 bg-danger-50 border border-danger-100 rounded-lg">
              <p className="text-sm text-danger-600">{forgotPasswordError}</p>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-6">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              autoComplete="email"
              {...register('email')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isForgotPasswordPending}
            >
              Send reset link
            </Button>
          </form>

          {/* Back link */}
          <p className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
