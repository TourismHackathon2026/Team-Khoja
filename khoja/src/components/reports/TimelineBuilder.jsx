import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Input from '../ui/Input';
import { Trash2 } from 'lucide-react';

const createIcon = (color) => L.divIcon({
  html: `<div style="background-color: ${color};" class="text-white rounded-full p-1 shadow-lg w-6 h-6 flex items-center justify-center -mt-3 -ml-3 border-2 border-white"></div>`,
  className: '',
});

function MapEvents({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function TimelineBuilder({ waypoints, onChange, error }) {
  const [activePoint, setActivePoint] = useState(null);

  const addWaypoint = (latlng) => {
    const newPoint = {
      id: Date.now().toString(),
      lat: latlng.lat,
      lng: latlng.lng,
      location_name: 'Selected Location',
      time: '',
      notes: ''
    };
    onChange([...waypoints, newPoint]);
    setActivePoint(newPoint.id);
  };

  const updateWaypoint = (id, field, value) => {
    onChange(waypoints.map(wp => wp.id === id ? { ...wp, [field]: value } : wp));
  };

  const removeWaypoint = (id) => {
    onChange(waypoints.filter(wp => wp.id !== id));
    if (activePoint === id) setActivePoint(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="font-medium text-text">Route Timeline</h4>
          <p className="text-sm text-muted">Click on the map to add locations where you last had the item.</p>
        </div>
      </div>

      <div className="h-[300px] w-full rounded-lg overflow-hidden border border-border relative z-0">
        <MapContainer center={[28.3949, 84.1240]} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapEvents onLocationSelect={addWaypoint} />
          {waypoints.map((wp, i) => (
            <Marker 
              key={wp.id} 
              position={[wp.lat, wp.lng]} 
              icon={createIcon(i === 0 ? '#1B4332' : i === waypoints.length - 1 ? '#E63946' : '#F4A261')}
              eventHandlers={{ click: () => setActivePoint(wp.id) }}
            />
          ))}
        </MapContainer>
      </div>

      {error && <p className="text-sm text-lost">{error}</p>}

      <div className="space-y-3">
        {waypoints.map((wp, i) => (
          <div key={wp.id} className={`p-3 rounded-lg border ${activePoint === wp.id ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${i === 0 ? 'bg-primary' : i === waypoints.length - 1 ? 'bg-lost' : 'bg-accent'}`}>
                  {i + 1}
                </div>
                <span className="font-medium text-sm">
                  {i === 0 ? 'Last definitely had it here' : i === waypoints.length - 1 ? 'First noticed missing here' : 'Middle waypoint'}
                </span>
              </div>
              <button type="button" onClick={() => removeWaypoint(wp.id)} className="text-muted hover:text-lost cursor-pointer">
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Input
                label="Location Name"
                value={wp.location_name}
                onChange={(e) => updateWaypoint(wp.id, 'location_name', e.target.value)}
              />
              <Input
                label="Time (Optional)"
                type="time"
                value={wp.time}
                onChange={(e) => updateWaypoint(wp.id, 'time', e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Notes (Optional)"
                  multiline
                  rows={2}
                  placeholder="e.g. Stopped for tea"
                  value={wp.notes}
                  onChange={(e) => updateWaypoint(wp.id, 'notes', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        {waypoints.length === 0 && (
          <div className="text-center p-6 bg-bg rounded-lg border border-dashed border-border text-muted text-sm">
            No waypoints added yet. Click on the map to start building your route.
          </div>
        )}
      </div>
    </div>
  );
}
