import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useFoundItemsRealtime(onNewItem) {
  useEffect(() => {
    const channel = supabase
      .channel('found_items_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'found_items' },
        (payload) => onNewItem(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewItem]);
}

export function useLossReportsRealtime(onNewReport) {
  useEffect(() => {
    const channel = supabase
      .channel('loss_reports_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'loss_reports' },
        (payload) => onNewReport(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewReport]);
}
