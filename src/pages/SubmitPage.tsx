import { Navigate } from 'react-router-dom';
import { useCampaign } from '../contexts/CampaignContext';
import AccessCodeGate from '../components/submission/AccessCodeGate';
import SubmissionForm from '../components/submission/SubmissionForm';

export default function SubmitPage() {
  const campaign = useCampaign();
  if (!campaign.bigSigns) return <Navigate to={`/c/${campaign.slug}`} replace />;
  return (
    <AccessCodeGate>
      <SubmissionForm />
    </AccessCodeGate>
  );
}
