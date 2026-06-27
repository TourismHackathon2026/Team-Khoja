import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { generateClaimCode } from '../../lib/generateClaimCode';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import HandoverPhotoUpload from '../handover/HandoverPhotoUpload';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Camera } from 'lucide-react';

// Step 1 — tourist provides identifying detail → claim code generated + handover row created
// Step 2 — finder uploads handover photo (optional but encouraged)
// Step 3 — done

export default function ClaimModal({ isOpen, onClose, item, onSuccess }) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [detail, setDetail] = useState('');
  const [claimCode, setClaimCode] = useState(null);
  const [handoverId, setHandoverId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    if (!detail.trim()) return;
    if (!user) {
      setError('You must be logged in to claim an item.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newCode = generateClaimCode();

      // 1. Write the claim code onto the found item
      const { error: updateError } = await supabase
        .from('found_items')
        .update({ claim_code: newCode, status: 'matched' })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // 2. Create the handover audit row immediately
      const { data: handover, error: handoverError } = await supabase
        .from('handovers')
        .insert({
          found_item_id: item.id,
          loss_report_id: item.matched_report_id || null,
          claim_code: newCode,
          claimed_by: user.id,
          handed_over_by: item.posted_by || null,
          notes: detail.trim(),
        })
        .select()
        .single();

      if (handoverError) throw handoverError;

      setClaimCode(newCode);
      setHandoverId(handover.id);
      setStep(2);
      if (onSuccess) onSuccess(newCode);
    } catch (err) {
      setError(err.message || 'Failed to generate claim code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSuccess = () => {
    setStep(3);
  };

  const handleSkipPhoto = () => {
    setStep(3);
  };

  // Step 1 — Verify ownership
  if (step === 1) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('claim.title') || 'Claim This Item'}>
        <form onSubmit={handleGenerateCode} className="space-y-4">
          <p className="text-sm text-muted">
            To claim this item, describe a unique detail only the true owner would know —
            a scratch, what's inside, a serial number, etc.
          </p>
          <Input
            label="Identifying Detail"
            multiline
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Describe a unique feature..."
            required
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={loading}
              disabled={!detail.trim()}
            >
              Generate Claim Code
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  // Step 2 — Show code + collect handover photo
  if (step === 2) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Your Claim Code">
        <div className="space-y-6">
          {/* Claim code display */}
          <div className="text-center">
            <p className="text-sm text-muted mb-3">
              Show this code to the finder to complete the handover.
            </p>
            <div className="bg-bg border-2 border-primary border-dashed rounded-xl p-6 inline-block w-full">
              <span className="text-xs text-muted uppercase tracking-wider mb-1 block">
                {t('claim.code_label') || 'Claim Code'}
              </span>
              <span className="font-mono text-4xl font-bold tracking-[0.2em] text-primary">
                {claimCode}
              </span>
            </div>
          </div>

          {/* Handover photo */}
          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Camera size={18} className="text-primary" />
              <h4 className="font-semibold text-text text-sm">
                Upload Handover Photo <span className="text-muted font-normal">(optional)</span>
              </h4>
            </div>
            <p className="text-xs text-muted mb-3">
              A photo of the handover moment creates a verified audit trail for both parties.
            </p>
            <HandoverPhotoUpload
              handoverId={handoverId}
              onUploadSuccess={handlePhotoSuccess}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={handleSkipPhoto}>
              Skip photo, I'm done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Step 3 — Success
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Handover Complete">
      <div className="text-center space-y-4 py-2">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck size={32} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-text">All done!</h3>
        <p className="text-sm text-muted">
          The handover has been recorded. Both parties can find this record in their dashboard.
        </p>
        <Button variant="primary" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
