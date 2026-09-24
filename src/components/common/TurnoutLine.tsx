import { useCampaign } from '../../contexts/CampaignContext';
import { demShare, formatVotes } from '../../utils/turnout';
import type { MapMarker } from '../../types';

/**
 * Priority tier, statewide rank and reference turnout for a site, e.g.
 * "★ Priority 1 · #7 in Texas / 11,247 early votes in the March primary · 68% Dem".
 * Renders nothing for sites without turnout numbers.
 */
export default function TurnoutLine({ marker }: { marker: MapMarker }) {
  const campaign = useCampaign();
  if (!campaign.priority || !marker.priorityRank || !marker.evTotal) return null;
  const share = demShare(marker);
  return (
    <div className={`turnout-line${marker.priorityTier ? ` turnout-line-p${marker.priorityTier}` : ''}`}>
      <div className="turnout-line-rank">
        {marker.priorityTier && (
          <span className="turnout-line-tier">{marker.priorityTier === 1 ? '★ ' : ''}Priority {marker.priorityTier} · </span>
        )}
        #{marker.priorityRank} in Texas
      </div>
      <div className="turnout-line-votes">
        {marker.evEstimated ? '~' : ''}{formatVotes(marker.evTotal)} early votes in the {campaign.priority.sourceLabel}
        {share != null && <> · {Math.round(share * 100)}% Dem</>}
      </div>
    </div>
  );
}
