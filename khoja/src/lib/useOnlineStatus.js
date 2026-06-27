/* eslint-disable react-hooks/refs */
import { useEffect, useRef, useState, useCallback } from 'react';
import { syncDrafts } from './offlineQueue';
import { supabase } from './supabase';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // useRef so the event listener always calls the latest version of triggerSync
  const triggerSyncRef = useRef(null);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await syncDrafts(supabase, (progress) => {
        // forward live progress so OfflineBanner can show X/Y
        setSyncResult({ ...progress });
      });
      setSyncResult(result);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncResult({ succeeded: 0, failed: 1, total: 1, done: 1 });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Keep the ref current every render
  triggerSyncRef.current = triggerSync;

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Small delay — browser "online" fires before network is actually usable
      setTimeout(() => triggerSyncRef.current?.(), 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncResult(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // intentionally empty — uses ref to avoid stale closure

  return { isOnline, isSyncing, syncResult, triggerSync };
}
