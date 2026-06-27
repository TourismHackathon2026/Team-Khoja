/* eslint-disable no-unused-vars */
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import ItemGrid from '../components/items/ItemGrid';
import ReportCard from '../components/reports/ReportCard';
import HandoverCard from '../components/claim/HandoverCard';
import Spinner from '../components/ui/Spinner';
import { Package, Search, Handshake } from 'lucide-react';
import { getDrafts } from '../lib/offlineQueue';
import { useOnlineStatus } from '../lib/useOnlineStatus';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { isOnline } = useOnlineStatus();
  
  const [foundItems, setFoundItems] = useState([]);
  const [lostReports, setLostReports] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('found');

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      try {
        const [
          { data: found },
          { data: lost },
          { data: hand }
        ] = await Promise.all([
          supabase.from('found_items').select('*').eq('posted_by', user.id).order('created_at', { ascending: false }),
          supabase.from('loss_reports').select('*').eq('reported_by', user.id).order('created_at', { ascending: false }),
          supabase.from('handovers').select(`
            *,
            claimed_by_profile:profiles!handovers_claimed_by_fkey(full_name),
            handed_over_by_profile:profiles!handovers_handed_over_by_fkey(full_name)
          `).or(`claimed_by.eq.${user.id},handed_over_by.eq.${user.id}`).order('created_at', { ascending: false })
        ]);

        setFoundItems(found || []);
        setLostReports(lost || []);
        setHandovers(hand || []);
        
        const localDrafts = await getDrafts();
        setDrafts(localDrafts);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const tabs = [
    { id: 'found', label: 'Items You Found', icon: Package, count: foundItems.length },
    { id: 'lost', label: 'Your Loss Reports', icon: Search, count: lostReports.length },
    { id: 'handovers', label: 'Handovers', icon: Handshake, count: handovers.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-text">Dashboard</h1>
        <p className="text-muted mt-2">Welcome back, {profile?.full_name}</p>
      </div>

      {drafts.length > 0 && !isOnline && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="font-semibold text-amber-800 mb-1">Offline Drafts Pending</h3>
          <p className="text-sm text-amber-700">You have {drafts.length} item(s) saved offline. They will sync automatically when you reconnect.</p>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border shadow-sm mb-8 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted hover:text-text hover:bg-bg'
                }`}
              >
                <Icon size={18} className="mr-2" />
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-primary/20' : 'bg-bg'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="p-6">
          {activeTab === 'found' && (
            <ItemGrid items={foundItems} emptyMessage="You haven't posted any found items yet." />
          )}
          
          {activeTab === 'lost' && (
            lostReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lostReports.map(report => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-bg rounded-xl border border-dashed border-border">
                <p className="text-muted">You haven't filed any loss reports.</p>
              </div>
            )
          )}
          
          {activeTab === 'handovers' && (
            handovers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {handovers.map(handover => (
                  <HandoverCard key={handover.id} handover={handover} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-bg rounded-xl border border-dashed border-border">
                <p className="text-muted">No handovers recorded yet.</p>
                <Link to="/claim" className="text-primary font-medium hover:underline mt-2 inline-block">
                  Have a claim code? Process a handover.
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
