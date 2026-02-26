import { useState, type FormEvent } from 'react';
import { useAccessCode } from '../../hooks/useAccessCode';

interface AccessCodeModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AccessCodeModal({ onSuccess, onClose }: AccessCodeModalProps) {
  const { error, validate } = useAccessCode();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [showCode, setShowCode] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    const valid = await validate(code);
    setChecking(false);
    if (valid) onSuccess();
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="access-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Volunteer Access</h3>
        <p>Enter the access code to mark polling sites as dressed.</p>
        <form onSubmit={handleSubmit}>
          <div className="password-input-wrapper">
            <input
              type={showCode ? 'text' : 'password'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              required
              autoFocus
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowCode(!showCode)}
              aria-label={showCode ? 'Hide code' : 'Show code'}
            >
              {showCode ? 'Hide' : 'Show'}
            </button>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={checking}>
              {checking ? 'Verifying...' : 'Enter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
