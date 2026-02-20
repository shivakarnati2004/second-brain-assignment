import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const resetPassword = () => setPassword('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Account creation failed');
      }

      toast.success('Account created. Please sign in.');
      setMode('signin');
      resetPassword();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Account creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Login failed');
      }

      toast.success('Logged in successfully');
      await router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login — Second Brain</title>
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass" style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 10 }}>
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: 20 }}>
            {mode === 'signup'
              ? 'Create your account first, then sign in to access your Second Brain.'
              : 'Use your account credentials to continue.'}
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setMode('signup')}
              style={{ flex: 1, opacity: mode === 'signup' ? 1 : 0.65 }}
            >
              Sign Up
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setMode('signin')}
              style={{ flex: 1, opacity: mode === 'signin' ? 1 : 0.65 }}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={mode === 'signup' ? handleRegister : handleLogin}>
            {mode === 'signup' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--color-muted)' }}>Name</label>
                <input
                  className="brain-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--color-muted)' }}>Email</label>
              <input
                className="brain-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--color-muted)' }}>Password</label>
              <input
                className="brain-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={mode === 'signup' ? 8 : undefined}
                required
              />
              {mode === 'signup' && (
                <p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-muted)' }}>
                  Use at least 8 characters.
                </p>
              )}
            </div>

            <button className="btn-primary" type="submit" style={{ width: '100%' }} disabled={loading}>
              {loading
                ? mode === 'signup'
                  ? 'Creating account...'
                  : 'Signing in...'
                : mode === 'signup'
                  ? 'Create Account →'
                  : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
