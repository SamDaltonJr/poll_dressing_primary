import { useState, type FormEvent, type ReactNode } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface AdminLoginProps {
  children: ReactNode;
}

export default function AdminLogin({ children }: AdminLoginProps) {
  const { isAdmin, error, validate } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAdmin) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    await validate(password);
    setChecking(false);
  }

  return (
    <div className="access-gate">
      <div className="access-gate-card">
        <h2>Admin Access</h2>
        <p>Enter the admin password to continue.</p>
        <form onSubmit={handleSubmit}>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              required
              autoFocus
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <button type="submit" className="btn btn-primary" disabled={checking}>
            {checking ? 'Verifying...' : 'Log In'}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
