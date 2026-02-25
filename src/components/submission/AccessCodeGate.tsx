import { useState, type FormEvent, type ReactNode } from 'react';
import { useAccessCode } from '../../hooks/useAccessCode';

interface AccessCodeGateProps {
  children: ReactNode;
}

export default function AccessCodeGate({ children }: AccessCodeGateProps) {
  const { isValid, error, validate } = useAccessCode();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  if (isValid) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    await validate(code);
    setChecking(false);
  }

  return (
    <div className="access-gate">
      <div className="access-gate-card">
        <h2>Volunteer Access</h2>
        <p>Enter the access code to submit a sign placement.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            required
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={checking}>
            {checking ? 'Verifying...' : 'Enter'}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
