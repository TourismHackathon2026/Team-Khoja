/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { safeFormatDate } from '../lib/dateUtils';
import { MapPin, Clock, ArrowLeft, Navigation, Phone } from 'lucide-react';
import CategoryBadge from '../components/items/CategoryBadge';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import MapView from '../components/map/MapView';
import { notifyNearbySpotters } from '../lib/notifySpotters';
import { useOnlineStatus } from '../lib/useOnlineStatus';

export default function ReportDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { isOnline } = useOnlineStatus();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('loss_reports')
          .select('*, profiles:reported_by(full_name, phone)')
          .eq('id', id)
          .single();
          
        if (fetchError) throw fetchError;
        setReport(data);
      } catch (err) {
        setError('Report not found or an error occurred.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReport();
  }, [id]);

  const handleNotifySpotters = async () => {
    if (!isOnline) {
      alert("You need to be online to notify spotters immediately.");
      return;
    }
    setNotifying(true);
    try {
      await notifyNearbySpotters(supabase, report);
      alert("Spotters in the area have been notified!");
    } catch (err) {
      console.error(err);
      alert("Failed to notify spotters.");
    } finally {
      setNotifying(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error || !report) return <div className="text-center py-20 text-lost">{error || 'Not found'}</div>;

  const statusColors = {
    searching: 'amber',
    matched: 'blue',
    recovered: 'green',
    closed: 'gray'
  };

  const center = report.last_seen_lat ? [report.last_seen_lat, report.last_seen_lng] : [28.3949, 84.1240];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/lost-reports" className="inline-flex items-center text-sm font-medium text-muted hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Loss Reports
      </Link>
      
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm mb-8">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <CategoryBadge category={report.category} />
                <Badge variant={statusColors[report.status] || 'gray'}>
                  {t(`status.${report.status}`)}
                </Badge>
              </div>
              <h1 className="text-3xl font-heading font-bold text-text mb-2">{report.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                <div className="flex items-center">
                  <Clock size={16} className="mr-1.5" />
                  Reported {safeFormatDate(report.created_at)}
                </div>
              </div>
            </div>
            
            {report.status === 'searching' && (
              <Button 
                variant="outline" 
                onClick={handleNotifySpotters}
                isLoading={notifying}
                disabled={notifying || !isOnline}
                className="w-full md:w-auto"
              >
                <Navigation size={16} className="mr-2" /> Notify Spotters
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2 text-text">Description</h3>
                <p className="whitespace-pre-wrap bg-bg p-4 rounded-xl border border-border/50 text-text">{report.description}</p>
              </div>
              
              {report.location_timeline && report.location_timeline.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3 text-text">Timeline of Events</h3>
                  <div className="space-y-4">
                    {report.location_timeline.map((wp, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            i === 0 ? 'bg-primary' : i === report.location_timeline.length - 1 ? 'bg-lost' : 'bg-accent'
                          }`}>
                            {i + 1}
                          </div>
                          {i < report.location_timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-border my-1"></div>
                          )}
                        </div>
                        <div className="bg-bg border border-border rounded-xl p-4 flex-1">
                          <p className="font-semibold text-text">{wp.location_name}</p>
                          {wp.time && <p className="text-sm text-muted flex items-center mt-1"><Clock size={14} className="mr-1"/> {wp.time}</p>}
                          {wp.notes && <p className="text-sm mt-2">{wp.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <h3 className="font-semibold text-primary mb-3">Contact Information</h3>
                {report.profiles?.phone ? (
                  <a href={`tel:${report.profiles.phone}`} className="flex items-center text-text hover:text-primary font-medium p-2 bg-white rounded-lg shadow-sm border border-border">
                    <Phone size={18} className="mr-3 text-primary" />
                    {report.profiles.phone}
                  </a>
                ) : (
                  <p className="text-sm text-muted">No public phone number provided. Must match via platform.</p>
                )}
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <p className="text-xs text-muted">If you have found this item, please post it as "Found" and our system will automatically match it.</p>
                  <Link to="/post-found" className="mt-3 block">
                    <Button variant="primary" size="sm" className="w-full">Post Found Item</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
        <h3 className="text-xl font-heading font-bold mb-4">Last Seen Location</h3>
        <div className="h-[400px] rounded-xl overflow-hidden border border-border relative z-0">
          <MapView lossReports={[report]} center={center} zoom={14} />
        </div>
      </div>
    </div>
  );
}
