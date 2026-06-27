/* eslint-disable no-unused-vars */
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import ItemMarker from './ItemMarker';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapView({ foundItems = [], lossReports = [], center = [28.3949, 84.1240], zoom = 7, style = { height: '100%', width: '100%' } }) {
  const { t } = useLanguage();

  return (
    <div style={style} className="z-10 h-full w-full">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {foundItems.map(item => (
          <ItemMarker key={`found-${item.id}`} item={item} type="found" />
        ))}
        
        {lossReports.map(report => (
          <ItemMarker key={`lost-${report.id}`} item={report} type="lost" />
        ))}
      </MapContainer>
    </div>
  );
}
