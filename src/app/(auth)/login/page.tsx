'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, TrendingUp, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/use-t';
import { useLanguageStore } from '@/store/language';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setLoading: setAuthLoading } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const t = useT();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async ({ email, password }: LoginForm) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Ensure loading=true in the store so the dashboard guard shows the
      // spinner rather than immediately redirecting to /login before
      // onAuthStateChanged has a chance to populate the user.
      setAuthLoading(true);
      router.push('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error(t.login.invalidCredential);
      } else if (code === 'auth/too-many-requests') {
        toast.error(t.login.tooManyRequests);
      } else {
        toast.error(t.login.loginFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-100 dark:from-gray-950 dark:to-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center bg-white dark:bg-gray-900 rounded-lg p-0.5 shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                language === 'en'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('bn')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                language === 'bn'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              বাং
            </button>
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 text-white mb-4 shadow-lg">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.login.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.login.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-brand-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.login.heading}</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t.login.emailLabel}
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder={t.login.emailPlaceholder}
                className={cn(
                  'w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-gray-800 dark:text-white transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                  errors.email
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 dark:border-gray-600'
                )}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t.login.passwordLabel}
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full px-4 py-2.5 pr-10 rounded-lg border text-sm bg-white dark:bg-gray-800 dark:text-white transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                    errors.password
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white transition-all',
                'bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                loading && 'opacity-60 cursor-not-allowed'
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.login.signingIn}
                </span>
              ) : (
                t.login.signIn
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {t.login.noAccount}{' '}
            <span className="text-brand-600 font-medium">{t.login.contactAdmin}</span>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Mians IT Farm. {t.login.footer}
        </p>
      </div>
    </div>
  );
}
