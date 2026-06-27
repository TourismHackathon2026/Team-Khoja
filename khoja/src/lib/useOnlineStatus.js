import { useEffect, useState } from 'react';
import { syncDrafts } from '../lib/offlineQueue';
import { supabase } from '../lib/supabase';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const triggerSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    setSyncResult(null);
    const result = await syncDrafts(supabase);
    setSyncResult(result);
    setIsSyncing(false);
  };

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Auto-sync when connection is restored
      await triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSyncing, syncResult, triggerSync };
}