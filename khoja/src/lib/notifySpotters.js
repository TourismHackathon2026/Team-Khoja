import { haversineKm } from './distanceCalc';

export async function notifyNearbySpotters(supabase, lossReport) {
  const { data: spotters } = await supabase
    .from('spotters')
    .select('*')
    .eq('is_active', true);

  const nearby = (spotters || []).filter(spotter => {
    if (!lossReport.last_seen_lat) return false;
    return haversineKm(
      spotter.lat, spotter.lng,
      lossReport.last_seen_lat, lossReport.last_seen_lng
    ) <= (spotter.radius_km || 5);
  });

  if (nearby.length > 0) {
    await supabase.from('notifications').insert(
      nearby.map(spotter => ({
        spotter_id: spotter.id,
        loss_report_id: lossReport.id,
        channel: 'sms',
        status: 'sent'
      }))
    );
  }

  return nearby;
}