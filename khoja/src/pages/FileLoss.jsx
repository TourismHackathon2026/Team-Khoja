/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { supabase } from '../lib/supabase';
import { saveDraft } from '../lib/offlineQueue';
import { matchLossReportToItems } from '../lib/matchItems';
import { notifyNearbySpotters } from '../lib/notifySpotters';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TimelineBuilder from '../components/reports/TimelineBuilder';
import { Map as MapIcon, Camera, CreditCard, Smartphone, Package, Briefcase, Watch, Key, HelpCircle } from 'lucide-react';

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

export default function FileLoss() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { isOnline } = useOnlineStatus();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('khoja-file-loss-draft');
    return saved ? JSON.parse(saved) : {
      category: '',
      title: '',
      description: '',
      waypoints: [],
      phone: '',
    };
  });

  useEffect(() => {
    localStorage.setItem('khoja-file-loss-draft', JSON.stringify(formData));
  }, [formData]);

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!user) {
      navigate('/auth', { state: { from: { pathname: '/file-loss' } } });
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const lastSeen = formData.waypoints[0] || {};
      
      const reportData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location_timeline: formData.waypoints,
        last_seen_lat: lastSeen.lat || null,
        last_seen_lng: lastSeen.lng || null,
        last_seen_location: lastSeen.location_name || null,
        reported_by: user?.id || null,
      };

      if (!isOnline) {
        await saveDraft('loss_report', reportData);
        localStorage.removeItem('khoja-file-loss-draft');
        alert(t('offline.banner') || 'You are offline. Saved as draft.');
        navigate('/dashboard');
        return;
      }

      const { data: insertedReport, error: insertError } = await supabase
        .from('loss_reports')
        .insert(reportData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Try to match and notify
      await matchLossReportToItems(supabase, insertedReport);
      await notifyNearbySpotters(supabase, insertedReport);

      localStorage.removeItem('khoja-file-loss-draft');
      navigate(`/lost-reports/${insertedReport.id}`);
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
        <h1 className="text-3xl font-heading font-bold text-text">{t('nav.lost')}</h1>
        <div className="flex items-center mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= i ? 'bg-primary text-white' : 'bg-bg text-muted border border-border'
              }`}>
                {i}
              </div>
              {i < 4 && (
                <div className={`w-12 h-1 ${step > i ? 'bg-primary' : 'bg-bg'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-medium text-text mb-4">What did you lose?</h2>
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

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-medium text-text mb-4">Item Details</h2>
            <Input
              label={t('form.title')}
              placeholder="e.g. German Passport"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Input
              label={t('form.description')}
              multiline
              rows={4}
              placeholder="Provide any identifying details, serial numbers, colors, etc."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            
            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handlePrev}>Back</Button>
              <Button 
                variant="primary" 
                onClick={handleNext}
                disabled={!formData.title || !formData.description}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-medium text-text mb-4">Timeline</h2>
            <TimelineBuilder
              waypoints={formData.waypoints}
              onChange={(waypoints) => setFormData({ ...formData, waypoints })}
            />

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={handlePrev}>Back</Button>
              <Button 
                variant="primary" 
                onClick={handleNext}
                disabled={formData.waypoints.length === 0}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-medium text-text mb-4">Contact Info</h2>
            <p className="text-sm text-muted mb-4">
              Provide a way for finders or spotters to reach you if your item is found.
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
              <Button 
                variant="primary" 
                onClick={handleSubmit} 
                disabled={!formData.phone}
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
