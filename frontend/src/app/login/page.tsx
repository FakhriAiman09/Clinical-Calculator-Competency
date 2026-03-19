'use client';

import Image from 'next/image';
import { SyntheticEvent, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import logo from '@/components/ccc-logo-color.svg';
import { login, signup, forgotPassword } from './actions';
import { createClient } from '@/utils/supabase/client';

// ── Inner component that uses useSearchParams() ──────────────────────────────
// Must be wrapped in <Suspense> at the page level to allow static prerendering.
function LoginForm() {
  const [emailValidationClass, setEmailValidationClass] = useState<string>('');
  const [passwordValidationClass, setPasswordValidationClass] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [alertColor, setAlertColor] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{ alertColor: string; message: string } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const redirectTo = searchParams?.get('redirectTo');
        router.push(redirectTo || '/dashboard');
      }
    };
    checkAuth();
  }, [router, searchParams, supabase.auth]);

  useEffect(() => {
    const redirectTo = localStorage.getItem('redirectTo');
    const wasRedirectSet = localStorage.getItem('redirectToDashboard') === 'true';
    if (wasRedirectSet || redirectTo) {
      localStorage.removeItem('redirectToDashboard');
      localStorage.removeItem('redirectTo');
      router.push(redirectTo || '/loading-user');
    }
  }, [router]);

  const validate = async (
    e: SyntheticEvent,
    authFunction: (formData: FormData) => Promise<{ alertColor: string; error: string }>,
    isSignup: boolean = false
  ) => {
    e.preventDefault();
    let valid = true;

    const form = (e.target as HTMLButtonElement).form as HTMLFormElement;
    const email = form.email.value.trim();
    const password = form.password.value;

    if (typeof email !== 'string' || email.length === 0 || !email.includes('@')) {
      valid = false;
      setEmailValidationClass('is-invalid');
    } else {
      setEmailValidationClass('is-valid');
    }

    if (typeof password !== 'string' || password.length < 8) {
      valid = false;
      setPasswordValidationClass('is-invalid');
    } else {
      setPasswordValidationClass('is-valid');
    }

    if (valid) {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const { alertColor, error } = await authFunction(formData);
      setAlertColor(alertColor);
      setError(error);

      if (!error) {
        await supabase.auth.getSession();
        if (isSignup) {
          router.push('/postsignup/verify');
        } else {
          const redirectTo = searchParams?.get('redirectTo');
          if (redirectTo) {
            localStorage.setItem('redirectTo', redirectTo);
          } else {
            localStorage.setItem('redirectToDashboard', 'true');
          }
          window.location.reload();
        }
      }
    }
  };

  const handleForgotPassword = async (e: SyntheticEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotResult(null);
    const formData = new FormData();
    formData.append('email', forgotEmail);
    const result = await forgotPassword(formData);
    setForgotResult(result);
    setForgotLoading(false);
  };

  const passwordIsValid = passwordValidationClass === 'is-valid';

  return (
    <>
      {/* Suppress browser-native password reveal icon (Edge/Chrome) */}
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear,
        input[type="password"]::-webkit-contacts-auto-fill-button,
        input[type="password"]::-webkit-credentials-auto-fill-button {
          display: none !important;
          visibility: hidden;
          pointer-events: none;
        }
      `}</style>

      {/* ── Main login card ── */}
      <div
        className='container d-flex flex-column justify-content-center gap-3 p-5 vh-100'
        style={{ maxWidth: '630px', overflow: 'hidden', maxHeight: '70vh' }}
      >
        <div>
          <span>
            <Image className='mb-3' src={logo} height={32} alt='CCC logo' />
          </span>
          <h1 className='fs-2'>Clinical Competency Calculator</h1>
        </div>

        <form id='login-form' className='needs-validation' noValidate onSubmit={(e) => e.preventDefault()}>
          {/* Email Input */}
          <div className='form-floating mb-3'>
            <input
              id='email'
              className={`form-control ${emailValidationClass}`}
              type='email'
              required
              aria-required='true'
              placeholder='email@example.com'
              onChange={() => {
                setEmailValidationClass('');
                setError(null);
              }}
            />
            <label htmlFor='email' className='form-label'>
              Email
            </label>
            <div className='invalid-feedback'>Please enter a valid email address.</div>
          </div>

          {/* Password Input with show/hide toggle */}
          <div className='mb-3'>
            <div className='form-floating' style={{ position: 'relative' }}>
              <input
                id='password'
                className={`form-control ${passwordValidationClass}`}
                type={showPassword ? 'text' : 'password'}
                required
                aria-required='true'
                placeholder='password'
                autoComplete='current-password'
                style={{
                  paddingRight: passwordIsValid ? undefined : '3.2rem',
                }}
                onChange={() => {
                  setPasswordValidationClass('');
                  setShowPassword(false);
                  setError(null);
                }}
              />
              <label htmlFor='password' className='form-label'>
                Password
              </label>

              {!passwordIsValid && (
                <button
                  type='button'
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    color: 'var(--bs-secondary-color, #6c757d)',
                    zIndex: 10,
                    lineHeight: 1,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='currentColor' viewBox='0 0 16 16'>
                      <path d='M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z' />
                      <path d='M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829' />
                      <path d='M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z' />
                    </svg>
                  ) : (
                    <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='currentColor' viewBox='0 0 16 16'>
                      <path d='M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z' />
                      <path d='M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0' />
                    </svg>
                  )}
                </button>
              )}

              <div className='invalid-feedback'>Password must be at least 8 characters long.</div>
            </div>

            <div className={`form-text ${passwordValidationClass === 'is-invalid' ? 'd-none' : ''}`}>
              Password must be at least 8 characters long.
            </div>
          </div>

          {/* Error Alert */}
          <div className={`alert alert-${alertColor} ${error ? 'visible' : 'invisible'}`}>{error}</div>

          {/* Buttons + Forgot Password */}
          <div className='d-flex justify-content-between align-items-center gap-2'>
            <button
              type='button'
              className='btn btn-link p-0 text-decoration-none'
              style={{ fontSize: '0.875rem' }}
              onClick={() => {
                setForgotResult(null);
                setForgotEmail('');
                setShowForgotModal(true);
              }}
            >
              Forgot password?
            </button>

            <div className='d-flex gap-2'>
              <button
                id='signup'
                className='btn btn-outline-secondary'
                type='button'
                onClick={(e) => validate(e, signup, true)}
              >
                Sign Up
              </button>
              <button id='login' className='btn btn-primary' type='submit' onClick={(e) => validate(e, login, false)}>
                Login
              </button>
            </div>
          </div>
        </form>

        <div className='pb-5'>{/* Spacing */}</div>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div
          className='modal fade show d-block'
          tabIndex={-1}
          role='dialog'
          aria-modal='true'
          aria-labelledby='forgotModalTitle'
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForgotModal(false);
          }}
        >
          <div className='modal-dialog modal-dialog-centered' style={{ maxWidth: '420px' }}>
            <div className='modal-content'>
              <div className='modal-header border-0 pb-0'>
                <h5 className='modal-title' id='forgotModalTitle'>
                  Reset your password
                </h5>
                <button
                  type='button'
                  className='btn-close'
                  aria-label='Close'
                  onClick={() => setShowForgotModal(false)}
                />
              </div>

              <form onSubmit={handleForgotPassword}>
                <div className='modal-body pt-2'>
                  <p className='text-muted' style={{ fontSize: '0.9rem' }}>
                    Enter your account email and we&apos;ll send you a link to reset your password.
                  </p>

                  <div className='form-floating mb-2'>
                    <input
                      id='forgot-email'
                      type='email'
                      className='form-control'
                      placeholder='email@example.com'
                      value={forgotEmail}
                      required
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setForgotResult(null);
                      }}
                      autoComplete='email'
                    />
                    <label htmlFor='forgot-email'>Email address</label>
                  </div>

                  {forgotResult && (
                    <div
                      className={`alert alert-${forgotResult.alertColor} py-2 px-3 mb-0`}
                      role='alert'
                      style={{ fontSize: '0.875rem' }}
                    >
                      {forgotResult.message}
                    </div>
                  )}
                </div>

                <div className='modal-footer border-0 pt-0'>
                  <button
                    type='button'
                    className='btn btn-outline-secondary'
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type='submit'
                    className='btn btn-primary d-flex align-items-center gap-2'
                    disabled={forgotLoading || forgotResult?.alertColor === 'success'}
                  >
                    {forgotLoading ? (
                      <>
                        <span className='spinner-border spinner-border-sm' role='status' aria-hidden='true' />
                        Sending…
                      </>
                    ) : (
                      'Send Reset Email'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page export — LoginForm is wrapped in Suspense so Next.js can statically
// prerender this route without hitting the useSearchParams() bailout. ─────────
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}