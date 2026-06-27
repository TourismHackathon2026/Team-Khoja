import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../ui/Button';

export default function HandoverPhotoUpload({ handoverId, onUploadSuccess }) {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file || !handoverId) return;
    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop();
      const path = `${handoverId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('handover-photos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('handover-photos')
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('handovers')
        .update({ handover_photo_url: publicUrl })
        .eq('id', handoverId);

      if (updateError) throw updateError;
      
      if (onUploadSuccess) onUploadSuccess(publicUrl);
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
  };

  if (preview) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button 
            type="button" 
            onClick={clearSelection}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 cursor-pointer"
            disabled={uploading}
          >
            <X size={16} />
          </button>
        </div>
        {error && <p className="text-sm text-lost">{error}</p>}
        <Button 
          variant="primary" 
          className="w-full" 
          onClick={handleUpload} 
          isLoading={uploading}
        >
          <Check size={16} className="mr-2" /> {t('claim.upload_photo')}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-muted mb-2" />
        <p className="text-sm font-medium text-text">
          {isDragActive ? 'Drop the photo here' : 'Click or drag a photo here'}
        </p>
        <p className="text-xs text-muted mt-1">Take a photo of the tourist receiving their item</p>
      </div>
      {error && <p className="text-sm text-lost mt-2">{error}</p>}
    </div>
  );
}
