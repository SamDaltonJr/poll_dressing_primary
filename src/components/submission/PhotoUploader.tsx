import { useState, useRef, type ChangeEvent } from 'react';

interface PhotoUploaderProps {
  onPhotoSelect: (file: File) => void;
}

export default function PhotoUploader({ onPhotoSelect }: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    onPhotoSelect(file);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleClear() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="photo-uploader">
      <label className="photo-upload-label">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
        />
        {preview ? 'Change Photo' : 'Take or Choose Photo'}
      </label>
      {preview && (
        <div className="photo-preview">
          <img src={preview} alt="Preview" />
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleClear}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
