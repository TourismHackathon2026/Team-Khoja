import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { safeFormatDate } from '../lib/dateUtils';
import { MapPin, Clock, ArrowLeft, ShieldCheck, HelpCircle } from 'lucide-react';
import CategoryBadge from '../components/items/CategoryBadge';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import MapView from '../components/map/MapView';
import ClaimModal from '../components/claim/ClaimModal';

export default function ItemDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('found_items')
          .select('id,title,description,category,photo_url,found_lat,found_lng,location_name,posted_by,claim_code,status,matched_report_id,created_at,profiles:posted_by(full_name, phone)')
          .eq('id', id)
          .single();
          
        if (fetchError) throw fetchError;
        setItem(data);
      } catch (err) {
        setError('Item not found or an error occurred.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchItem();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error || !item) return <div className="text-center py-20 text-lost">{error || 'Not found'}</div>;

  const statusColors = {
    unclaimed: 'gray',
    matched: 'amber',
    claimed: 'green',
    donated: 'blue'
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/found-items" className="inline-flex items-center text-sm font-medium text-muted hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Found Items
      </Link>
      
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Image */}
          <div className="bg-bg relative min-h-[300px] flex items-center justify-center">
            {item.photo_url ? (
              <img src={item.photo_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="text-muted flex flex-col items-center">
                <HelpCircle size={48} className="mb-2 opacity-20" />
                No photo available
              </div>
            )}
            <div className="absolute top-4 right-4 flex gap-2">
              <Badge variant={statusColors[item.status] || 'gray'} className="shadow-sm backdrop-blur-md bg-white/90">
                {t(`status.${item.status}`)}
              </Badge>
            </div>
          </div>
          
          {/* Right: Details */}
          <div className="p-6 md:p-8 flex flex-col h-full">
            <div className="mb-4">
              <CategoryBadge category={item.category} className="mb-3" />
              <h1 className="text-3xl font-heading font-bold text-text mb-2">{item.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                <div className="flex items-center">
                  <Clock size={16} className="mr-1.5" />
                  {safeFormatDate(item.created_at)}
                </div>
                <div className="flex items-center">
                  <MapPin size={16} className="mr-1.5 text-found" />
                  {item.location_name || 'Location recorded'}
                </div>
              </div>
            </div>
            
            <div className="prose prose-sm max-w-none text-text mb-8 flex-grow">
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <p className="whitespace-pre-wrap bg-bg p-4 rounded-xl border border-border/50">{item.description}</p>
            </div>

            <div className="mt-auto pt-6 border-t border-border">
              {item.status === 'unclaimed' || item.status === 'matched' ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-primary flex items-center">
                      <ShieldCheck size={18} className="mr-1.5" /> Is this yours?
                    </h4>
                    <p className="text-sm text-muted mt-1">Claim it securely to get contact details.</p>
                  </div>
                  <Button variant="primary" onClick={() => setIsClaimModalOpen(true)} className="w-full sm:w-auto shadow-md">
                    Claim Item
                  </Button>
                </div>
              ) : (
                <div className="bg-bg rounded-xl p-4 text-center text-muted">
                  This item is no longer available.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="mt-8 bg-surface rounded-2xl border border-border p-6 shadow-sm">
        <h3 className="text-xl font-heading font-bold mb-4">Found Location</h3>
        <div className="h-[400px] rounded-xl overflow-hidden border border-border relative z-0">
          <MapView foundItems={[item]} center={[item.found_lat, item.found_lng]} zoom={14} />
        </div>
      </div>

      {isClaimModalOpen && (
        <ClaimModal 
          isOpen={isClaimModalOpen} 
          onClose={() => setIsClaimModalOpen(false)} 
          item={item} 
        />
      )}
    </div>
  );
}
