/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Shield, MapPin, Award, CheckCircle } from 'lucide-react';
import Spinner from '../components/ui/Spinner';

export default function SpotterNetwork() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [spotters, setSpotters] = useState([]);
  const [isSpotter, setIsSpotter] = useState(profile?.role === 'spotter' || profile?.role === 'admin');

  useEffect(() => {
    const fetchSpotters = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, location_name')  // location_zone → location_name
        .eq('role', 'spotter')
        .limit(10);
      if (data) setSpotters(data);
    };
    fetchSpotters();
  }, []);

  const handleJoinNetwork = async () => {
    if (!user) {
      alert("Please sign in first to join the Spotter Network.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'spotter',
          location_name: profile?.location_name || 'Thamel, Kathmandu',
          is_spotter: true,
        })
        .eq('id', user.id);
        
      if (error) throw error;
      setIsSpotter(true);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to join network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <Shield size={64} className="mx-auto text-primary mb-4" />
        <h1 className="text-4xl font-heading font-bold text-text mb-4">Spotter Network</h1>
        <p className="text-lg text-muted max-w-2xl mx-auto">
          A community of verified locals, shopkeepers, and guides who receive instant SMS/push notifications when items are lost in their area.
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-8 border-b md:border-b-0 md:border-r border-border">
            <h2 className="text-2xl font-bold mb-4">How it works</h2>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="bg-primary/10 p-2 rounded-lg text-primary mr-3 mt-1"><MapPin size={20} /></div>
                <div>
                  <h4 className="font-semibold text-text">Register your Zone</h4>
                  <p className="text-sm text-muted">Tell us where you usually work or spend time.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-primary/10 p-2 rounded-lg text-primary mr-3 mt-1"><Shield size={20} /></div>
                <div>
                  <h4 className="font-semibold text-text">Get Instant Alerts</h4>
                  <p className="text-sm text-muted">Receive notifications when a tourist loses something near you.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-primary/10 p-2 rounded-lg text-primary mr-3 mt-1"><Award size={20} /></div>
                <div>
                  <h4 className="font-semibold text-text">Help & Get Rewarded</h4>
                  <p className="text-sm text-muted">Keep an eye out, secure found items, and help tourists. Build a reputation as a trusted local.</p>
                </div>
              </li>
            </ul>

            <div className="mt-8 pt-8 border-t border-border">
              {isSpotter ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                  <h4 className="font-bold text-green-800">You are an active Spotter</h4>
                  <p className="text-sm text-green-600 mt-1">Thank you for helping keep Nepal safe for tourists!</p>
                </div>
              ) : (
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="w-full" 
                  onClick={handleJoinNetwork}
                  isLoading={loading}
                >
                  Join the Spotter Network
                </Button>
              )}
            </div>
          </div>
          
          <div className="p-8 bg-bg">
            <h2 className="text-xl font-bold mb-6">Recent Spotters</h2>
            {spotters.length > 0 ? (
              <div className="space-y-4">
                {spotters.map((spotter, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface p-3 rounded-lg border border-border shadow-sm">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold mr-3">
                        {spotter.full_name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="font-semibold text-text text-sm">{spotter.full_name}</p>
                        <p className="text-xs text-muted flex items-center"><MapPin size={10} className="mr-1"/> {spotter.location_name || 'Kathmandu'}</p>
                      </div>
                    </div>
                    <Badge variant="green" className="text-[10px]">Verified</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Spinner size="md" className="mx-auto mb-2" />
                <p className="text-sm text-muted">Loading spotters...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
