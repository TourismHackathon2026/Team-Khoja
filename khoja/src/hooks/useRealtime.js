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

export function useTableChanges(table, event, callback) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}_${event}_changes`)
      .on('postgres_changes',
        { event: event, schema: 'public', table: table },
        (payload) => callback(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, callback]);
}
