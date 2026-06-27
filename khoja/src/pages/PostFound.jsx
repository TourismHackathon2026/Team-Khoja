/* eslint-disable no-unused-vars */
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { supabase } from '../lib/supabase';
import { saveDraft } from '../lib/offlineQueue';
import { matchFoundItemToReports } from '../lib/matchItems';
import { notifyNearbySpotters } from '../lib/notifySpotters';
import { hashAnswer } from '../lib/verifyOwnership';
import { runOwnerVerificationChecks, getChecklistStatus } from '../lib/ownerVerificationChecks';
import { notifyListingApproved, notifyListingRejected, notifyMatchFound } from '../lib/emailNotifications';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LocationPicker from '../components/map/LocationPicker';
import { Upload, X, Map as MapIcon, Camera, CreditCard, Smartphone, Package, Briefcase, Watch, Key, HelpCircle, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

const categories = [
  { id: 'passport', icon: MapIcon, label: 'Passport' },
  { id: 'camera', icon: Camera, label: 'Camera' },
  { id: 'wallet', icon: CreditCard, label: 'Wallet' },
  { id: 'phone', icon: Smartphone, label: 'Phone' },
  { id: 'trekking_gear', icon: Package, label: 'Trekking Gear' },
  { id: 'bag', icon: Briefcase, label: 'Bag' },
  { id: 'jewelry', icon: Watch, label: 'Jewelry' },
  { id: 'keys', icon: Key, label: 'Keys' },
  { id: 'other', icon: HelpCircle, label: 'Other' },
];

export default function PostFound() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationWarning, setVerificationWarning] = useState(null);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('khoja-post-found-draft');
    return saved ? JSON.parse(saved) : {
      category: '',
      title: '',
      description: '',
      location: null,
      phone: '',
    };
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [verificationQuestions, setVerificationQuestions] = useState([
    { q: '', a: '' },
    { q: '', a: '' },
    { q: '', a: '' },
  ]);

  useEffect(() => {
    localStorage.setItem('khoja-post-found-draft', JSON.stringify(formData));
  }, [formData]);

  // Live checklist status on step 5
  const checklistItems = getChecklistStatus(
    {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      found_lat: formData.location?.lat,
      found_lng: formData.location?.lng,
    },
    verificationQuestions
  );
  const allChecksPassed = checklistItems.every(c => c.pass);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleNext = () => { setError(null); setStep(s => s + 1); };
  const handlePrev = () => { setError(null); setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!user) {
      navigate('/auth', { state: { from: { pathname: '/post-found' } } });
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationWarning(null);

    try {
      // ── Build partial item data for checks ──────────────────────────────
      const partialItemData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        found_lat: formData.location?.lat,
        found_lng: formData.location?.lng,
      };

      // ── Run pre-listing owner verification checks ───────────────────────
      const checkResult = await runOwnerVerificationChecks(
        supabase,
        user,
        partialItemData,
        verificationQuestions
      );

      if (!checkResult.pass) {
        // Non-fatal path: notify user + optionally email them the rejection reason
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .single();

        await notifyListingRejected(supabase, {
          userEmail: profile?.email || user.email,
          userName: profile?.full_name,
          itemTitle: formData.title || 'your item',
          reason: checkResult.reason,
        });

        setError(checkResult.reason);
        setLoading(false);
        return;
      }

      // ── Photo upload ────────────────────────────────────────────────────
      let photoUrl = null;
      if (isOnline && photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('found-items')
          .upload(path, photoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('found-items')
          .getPublicUrl(path);
        photoUrl = publicUrl;
      }

      // ── Hash verification answers ───────────────────────────────────────
      const verification_questions = await Promise.all(
        verificationQuestions
          .filter(({ q, a }) => q.trim() && a.trim())
          .map(async ({ q, a }) => ({ q: q.trim(), a_hash: await hashAnswer(a) }))
      );

      const itemData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        photo_url: photoUrl,
        found_lat: formData.location.lat,
        found_lng: formData.location.lng,
        location_name: formData.location.address,
        posted_by: user?.id || null,
        claim_code: null,
        verification_questions,
        status: 'unclaimed',
      };

      // ── Offline path ────────────────────────────────────────────────────
      if (!isOnline) {
        await saveDraft('found_item', itemData);
        localStorage.removeItem('khoja-post-found-draft');
        alert(t('offline.banner') || 'You are offline. Saved as draft.');
        navigate('/dashboard');
        return;
      }

      // ── Insert to DB ────────────────────────────────────────────────────
      const { data: insertedItem, error: insertError } = await supabase
        .from('found_items')
        .insert(itemData)
        .select('id')
        .single();

      if (insertError) throw insertError;

      // ── Send listing-approved email ─────────────────────────────────────
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();

      await notifyListingApproved(supabase, {
        userEmail: profile?.email || user.email,
        userName: profile?.full_name,
        itemTitle: itemData.title,
        foundItemId: insertedItem.id,
      });

      // ── Match + notify ──────────────────────────────────────────────────
      const fullItem = { ...itemData, id: insertedItem.id };
      const matches = await matchFoundItemToReports(supabase, fullItem);

      if (matches && matches.length > 0) {
        for (const match of matches) {
          await notifyNearbySpotters(supabase, match);

          // Fetch full loss report for email (including reporter profile)
          const { data: lossReport } = await supabase
            .from('loss_reports')
            .select('*, profiles:reported_by(full_name, email)')
            .eq('id', match.id)
            .single();

          if (lossReport) {
            await notifyMatchFound(supabase, {
              foundItem: { ...fullItem, profiles: profile },
              lossReport,
            });
          }
        }
      }

      localStorage.removeItem('khoja-post-found-draft');
      navigate(`/found-items/${insertedItem.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while posting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-text">{t('nav.found')}</h1>
        <div className="flex items-center mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= i ? 'bg-primary text-white' : 'bg-bg text-muted border border-border'
              }`}>
                {i}
              </div>
              {i < 5 && (
                <div className={`w-12 h-1 ${step > i ? 'bg-primary' : 'bg-bg'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex gap-3 items-start">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Step 1: Category ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-medium text-text mb-4">What did you find?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all cursor-pointer ${
                      formData.category === cat.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-surface text-muted hover:border-primary/50'
                    }`}
                  >
                    <Icon size={32} className="mb-3" />
                    <span className="font-medium">{t(`cat.${cat.id}`) || cat.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="primary" onClick={handleNext} disabled={!formData.category}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Photo ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-medium text-text mb-4">Add a photo</h2>
            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border aspect-video">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted mb-4" />
                <p className="text-lg font-medium text-text">
                  {isDragActive ? 'Drop here' : 'Click or drag a photo here'}
                </p>
                <p className="text-sm text-muted mt-2">A clear photo helps the owner identify it</p>
              </div>
            )}
            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handlePrev}>Back</Button>
              <Button variant="primary" onClick={handleNext}>Next</Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Details & Location ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-medium text-text mb-4">Details & Location</h2>
            <Input
              label={t('form.title')}
              placeholder="e.g. Blue North Face Backpack"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Input
              label={t('form.description')}
              multiline
              rows={3}
              placeholder="Any identifying features, brand, colour, contents…"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div className="pt-2">
              <label className="text-sm font-medium text-text mb-1 block">{t('form.location')}</label>
              <LocationPicker
                value={formData.location}
                onChange={(loc) => setFormData({ ...formData, location: loc })}
              />
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handlePrev}>Back</Button>
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!formData.title || !formData.location?.lat}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Contact ───────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-medium text-text mb-4">Contact Info</h2>
            <p className="text-sm text-muted mb-4">
              Provide a way for the owner to reach you once they claim this item.
            </p>
            <Input
              label="Phone Number"
              placeholder="+977..."
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handlePrev} disabled={loading}>Back</Button>
              <Button variant="primary" onClick={handleNext} disabled={!formData.phone}>Next</Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Verification Questions + Pre-submit checklist ─────── */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div>
              <h2 className="text-xl font-medium text-text mb-1">Set Verification Questions</h2>
              <p className="text-sm text-muted">
                Ask questions only the true owner can answer. Two are required; the third is optional.
              </p>
            </div>

            {verificationQuestions.map((question, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-bg rounded-lg border border-border">
                <Input
                  label={`Question ${index + 1}${index === 2 ? ' (Optional)' : ''}`}
                  value={question.q}
                  onChange={(e) =>
                    setVerificationQuestions(verificationQuestions.map((item, i) =>
                      i === index ? { ...item, q: e.target.value } : item
                    ))
                  }
                  placeholder={
                    index === 0 ? 'What colour is the main zipper?' :
                    index === 1 ? 'What brand is the item?' :
                    'Any other identifying detail?'
                  }
                  required={index < 2}
                />
                <Input
                  label="Answer"
                  value={question.a}
                  onChange={(e) =>
                    setVerificationQuestions(verificationQuestions.map((item, i) =>
                      i === index ? { ...item, a: e.target.value } : item
                    ))
                  }
                  placeholder="e.g. Red"
                  required={index < 2}
                />
              </div>
            ))}

            {/* Pre-submit checklist */}
            <div className="border border-border rounded-xl p-4 bg-bg">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={16} className="text-primary" />
                <span className="text-sm font-semibold text-text">Listing quality checks</span>
              </div>
              <ul className="space-y-2">
                {checklistItems.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-sm">
                    {item.pass
                      ? <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                      : <XCircle size={15} className="text-red-400 shrink-0" />}
                    <span className={item.pass ? 'text-text' : 'text-red-600'}>{item.label}</span>
                  </li>
                ))}
              </ul>
              {!allChecksPassed && (
                <p className="mt-3 text-xs text-muted">
                  Complete the items above before submitting — they protect the owner and prevent your listing from being flagged.
                </p>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={handlePrev} disabled={loading}>Back</Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={
                  loading ||
                  verificationQuestions.slice(0, 2).some(({ q, a }) => !q.trim() || !a.trim()) ||
                  !allChecksPassed
                }
                isLoading={loading}
              >
                {t('form.submit')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
