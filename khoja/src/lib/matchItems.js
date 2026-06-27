import { haversineKm } from './distanceCalc';

export async function matchFoundItemToReports(supabase, foundItem) {
  const { data: reports } = await supabase
    .from('loss_reports')
    .select('id,category,status,last_seen_lat,last_seen_lng')
    .eq('category', foundItem.category)
    .eq('status', 'searching');

  return (reports || []).filter(report => {
    if (!report.last_seen_lat) return false;
    return haversineKm(
      foundItem.found_lat, foundItem.found_lng,
      report.last_seen_lat, report.last_seen_lng
    ) <= 15;
  });
}

export async function matchLossReportToItems(supabase, lossReport) {
  const { data: items } = await supabase
    .from('found_items')
    .select('id,category,status,found_lat,found_lng')
    .eq('category', lossReport.category)
    .eq('status', 'unclaimed');

  return (items || []).filter(item => {
    if (!lossReport.last_seen_lat) return false;
    return haversineKm(
      item.found_lat, item.found_lng,
      lossReport.last_seen_lat, lossReport.last_seen_lng
    ) <= 15;
  });
}
