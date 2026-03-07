import { useState, useCallback } from 'react';
import { shareInviteLink } from '../../utils/share';

export default function ShareButton() {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    const result = await shareInviteLink();
    if (result.method === 'clipboard' && result.success) {
      setTooltip('Link copied!');
      setTimeout(() => setTooltip(null), 2000);
    } else if (result.method === 'clipboard' && !result.success) {
      setTooltip('Failed to copy');
      setTimeout(() => setTooltip(null), 2000);
    }
  }, []);

  return (
    <button
      className="header-share-btn"
      onClick={handleShare}
      aria-label="Share volunteer invite link"
      title="Invite volunteers"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {tooltip && <span className="share-tooltip">{tooltip}</span>}
    </button>
  );
}
