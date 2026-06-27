import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useLossReports(options = {}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('loss_reports')
        .select(`*, profiles:reported_by(full_name, phone)`)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      if (options.category) {
        query = query.eq('category', options.category);
      }
      
      if (options.userId) {
        query = query.eq('reported_by', options.userId);
      }

      const { data, error: err } = await query;

      if (err) throw err;
      
      setReports(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [options.status, options.category, options.userId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, error, refetch: fetchReports };
}
