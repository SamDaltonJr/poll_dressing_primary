import { useState, type FormEvent, type ReactNode } from 'react';
import { useAdminAuth } from '../../contexts/AdminContext';
import LoadingSpinner from '../common/LoadingSpinner';

interface AdminLoginProps {
  children: ReactNode;
}

export default function AdminLogin({ children }: AdminLoginProps) {
  const { isAdmin, sessionLoading, error, validate } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAdmin) return <>{children}</>;
  if (sessionLoading) return <LoadingSpinner message="Signing in..." />;

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
        <p>Enter the statewide admin password or your regional coordinator code.</p>
        <form onSubmit={handleSubmit}>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password or coordinator code"
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
