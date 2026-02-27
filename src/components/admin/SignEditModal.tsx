import { useState, type FormEvent } from 'react';
import { updateSubmission } from '../../services/submissionService';
import type { SignSubmission, PostingMethod } from '../../types';

interface SubmissionEditModalProps {
  submission: SignSubmission;
  onClose: () => void;
  onSaved: () => void;
}

export default function SignEditModal({ submission, onClose, onSaved }: SubmissionEditModalProps) {
  const [volunteerName, setVolunteerName] = useState(submission.volunteerName);
  const [volunteerPhone, setVolunteerPhone] = useState(submission.volunteerPhone || '');
  const [volunteerEmail, setVolunteerEmail] = useState(submission.volunteerEmail || '');
  const [notes, setNotes] = useState(submission.notes);
  const [address, setAddress] = useState(submission.address);
  const [postingMethod, setPostingMethod] = useState<PostingMethod>(submission.postingMethod || 'fence');
  const [signCount, setSignCount] = useState(submission.signCount || 1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSubmission(submission.id, {
        volunteerName,
        volunteerPhone,
        volunteerEmail,
        notes,
        address,
        postingMethod,
        signCount,
      });
      onSaved();
    } catch {
      alert('Failed to update submission.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Submission</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Volunteer Name</label>
            <input
              type="text"
              value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={volunteerPhone}
              onChange={(e) => setVolunteerPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={volunteerEmail}
              onChange={(e) => setVolunteerEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Posting Method</label>
            <select
              value={postingMethod}
              onChange={(e) => setPostingMethod(e.target.value as PostingMethod)}
            >
              <option value="fence">Fence</option>
              <option value="tPost">T-Post</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Sign Count</label>
            <input
              type="number"
              min={1}
              max={10}
              value={signCount}
              onChange={(e) => setSignCount(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
