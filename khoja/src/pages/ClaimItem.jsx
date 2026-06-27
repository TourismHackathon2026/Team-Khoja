/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { ShieldCheck, Handshake, AlertCircle } from 'lucide-react';

export default function ClaimItem() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim() || !user) return;
    
    setLoading(true);
    setError(null);

    const RL_KEY = 'khoja-claim-attempts';
    const RL_WINDOW = 15 * 60 * 1000;
    const MAX_ATTEMPTS = 5;
    const stored = JSON.parse(localStorage.getItem(RL_KEY) || '{"count":0,"since":0}');
    if (Date.now() - stored.since < RL_WINDOW && stored.count >= MAX_ATTEMPTS) {
      setError(`Too many attempts. Please wait ${Math.ceil((stored.since + RL_WINDOW - Date.now()) / 60000)} minutes.`);
      setLoading(false);
      return;
    }
    const newStored = Date.now() - stored.since > RL_WINDOW
      ? { count: 1, since: Date.now() }
      : { ...stored, count: stored.count + 1 };
    localStorage.setItem(RL_KEY, JSON.stringify(newStored));
    
    try {
      // 1. Find the item by claim code
      const { data: items, error: findError } = await supabase
        .from('found_items')
        .select('id,posted_by,status,claim_code')
        .eq('claim_code', code.trim().toUpperCase());
        
      if (findError) throw findError;
      if (!items || items.length === 0) {
        throw new Error('Invalid claim code. Please check and try again.');
      }
      
      const item = items[0];
      
      if (item.status === 'claimed' || item.status === 'donated') {
        throw new Error('This item has already been claimed or donated.');
      }
      
      // 2. Create handover record
      const { error: handoverError } = await supabase
        .from('handovers')
        .insert({
          found_item_id: item.id,
          claimed_by: user.id,
          handed_over_by: item.posted_by,
          claim_code: code.trim().toUpperCase()
        });
        
      if (handoverError) throw handoverError;
      
      // 3. Update item status
      const { error: updateError } = await supabase
        .from('found_items')
        .update({ status: 'claimed' })
        .eq('id', item.id);
        
      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
        <p className="text-muted mb-6">You must be logged in to claim an item.</p>
        <Button variant="primary" onClick={() => navigate('/auth')}>Go to Login</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Handshake size={40} className="text-green-600" />
        </div>
        <h2 className="text-3xl font-heading font-bold text-text mb-4">Handover Verified!</h2>
        <p className="text-muted mb-8">
          The claim code was correct. The handover has been recorded securely in the system.
        </p>
        <p className="text-sm text-primary font-medium">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <ShieldCheck size={48} className="mx-auto text-primary mb-4" />
        <h1 className="text-3xl font-heading font-bold text-text mb-2">Verify Handover</h1>
        <p className="text-muted">
          Enter the claim code provided by the system to securely complete the handover.
        </p>
      </div>

      <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm">
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2 text-center">
              Claim Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123DEF"
              className="w-full text-center text-3xl font-mono font-bold tracking-widest py-4 bg-bg border-2 border-dashed border-primary/50 rounded-xl focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase"
              maxLength={10}
              required
            />
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}
          
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full"
            isLoading={loading}
            disabled={code.length < 5}
          >
            Verify & Complete Handover
          </Button>
        </form>
      </div>
    </div>
  );
}
