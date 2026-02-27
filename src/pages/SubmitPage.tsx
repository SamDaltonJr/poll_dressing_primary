import AccessCodeGate from '../components/submission/AccessCodeGate';
import SubmissionForm from '../components/submission/SubmissionForm';

export default function SubmitPage() {
  return (
    <AccessCodeGate>
      <SubmissionForm />
    </AccessCodeGate>
  );
}
