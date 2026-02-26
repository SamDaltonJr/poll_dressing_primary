import { useState, type FormEvent } from 'react';
import { addDistributionPoint, updateDistributionPoint } from '../../services/distributionPointService';
import type { DistributionPoint } from '../../types';

interface DistributionPointModalProps {
  point?: DistributionPoint;
  onClose: () => void;
  onSaved: () => void;
}

export default function DistributionPointModal({ point, onClose, onSaved }: DistributionPointModalProps) {
  const [name, setName] = useState(point?.name ?? '');
  const [address, setAddress] = useState(point?.address ?? '');
  const [latitude, setLatitude] = useState(point?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(point?.longitude?.toString() ?? '');
  const [signCount, setSignCount] = useState(point?.signCount?.toString() ?? '0');
  const [notes, setNotes] = useState(point?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const input = {
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        signCount: parseInt(signCount, 10) || 0,
        notes: notes || undefined,
      };
      if (point) {
        await updateDistributionPoint(point.id, input);
      } else {
        await addDistributionPoint(input);
      }
      onSaved();
    } catch {
      alert('Failed to save distribution point.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{point ? 'Edit Distribution Point' : 'Add Distribution Point'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Campaign HQ"
            />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="e.g. 123 Main St, Dallas, TX 75201"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
                placeholder="32.78"
              />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
                placeholder="-96.80"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Sign Count</label>
            <input
              type="number"
              min="0"
              value={signCount}
              onChange={(e) => setSignCount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Pickup hours: 9am-5pm"
            />
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : point ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
