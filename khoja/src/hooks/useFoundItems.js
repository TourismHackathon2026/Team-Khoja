import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useFoundItems(options = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('found_items')
        .select(`id,title,description,category,photo_url,found_lat,found_lng,location_name,posted_by,claim_code,status,matched_report_id,created_at,profiles:posted_by(full_name, phone)`)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }
      
      if (options.category) {
        query = query.eq('category', options.category);
      }

      const { data, error: err } = await query;

      if (err) throw err;
      
      let finalData = data;
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        finalData = finalData.filter(item => 
          (item.title && item.title.toLowerCase().includes(searchLower)) ||
          (item.description && item.description.toLowerCase().includes(searchLower)) ||
          (item.location_name && item.location_name.toLowerCase().includes(searchLower))
        );
      }
      
      setItems(finalData || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [options.status, options.category, options.search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}
