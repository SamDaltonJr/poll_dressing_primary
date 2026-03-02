import { useState, useEffect, type FormEvent } from 'react';
import { addPlannedSign, updatePlannedSign } from '../../services/plannedSignService';
import { reverseGeocode } from '../../services/geocodeService';
import type { PlannedSignLocation, PlannedSignStatus } from '../../types';

interface PlannedSignModalProps {
  sign?: PlannedSignLocation;
  latitude?: number;
  longitude?: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function PlannedSignModal({ sign, latitude, longitude, onClose, onSaved }: PlannedSignModalProps) {
  const [name, setName] = useState(sign?.name ?? '');
  const [address, setAddress] = useState(sign?.address ?? '');
  const [lat, setLat] = useState(sign?.latitude?.toString() ?? latitude?.toString() ?? '');
  const [lng, setLng] = useState(sign?.longitude?.toString() ?? longitude?.toString() ?? '');
  const [notes, setNotes] = useState(sign?.notes ?? '');
  const [status, setStatus] = useState<PlannedSignStatus>(sign?.status ?? 'planned');
  const [saving, setSaving] = useState(false);

  // Auto-fill address via reverse geocode when creating from pin drop
  useEffect(() => {
    if (!sign && latitude && longitude) {
      reverseGeocode(latitude, longitude).then((addr) => {
        setAddress(addr);
      }).catch(() => {
        // Leave address empty for manual entry
      });
    }
  }, [sign, latitude, longitude]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const input = {
        name,
        address,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        notes: notes || undefined,
        status,
      };
      if (sign) {
        await updatePlannedSign(sign.id, input);
      } else {
        await addPlannedSign(input);
      }
      onSaved();
    } catch {
      alert('Failed to save planned sign location.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{sign ? 'Edit Planned Sign' : 'Add Planned Sign Location'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Corner of Main & Elm"
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
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
                placeholder="32.78"
              />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
                placeholder="-96.80"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Need permission from property owner"
            />
          </div>
          {sign && (
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as PlannedSignStatus)}>
                <option value="planned">Planned</option>
                <option value="placed">Placed</option>
              </select>
            </div>
          )}
          <div className="confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : sign ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
