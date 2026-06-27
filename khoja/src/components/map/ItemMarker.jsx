/* eslint-disable no-unused-vars */
import { Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Badge from '../ui/Badge';
import CategoryBadge from '../items/CategoryBadge';
import L from 'leaflet';

const foundIcon = L.divIcon({
  html: `<div class="bg-found text-white rounded-full p-1.5 shadow-lg flex items-center justify-center border-2 border-white w-8 h-8 -mt-4 -ml-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16M4 14h16M4 18h16M4 6h16"/></svg>
         </div>`,
  className: '',
});

const lostIcon = L.divIcon({
  html: `<div class="bg-lost text-white rounded-full p-1.5 shadow-lg flex items-center justify-center border-2 border-white w-8 h-8 -mt-4 -ml-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
         </div>`,
  className: '',
});

export default function ItemMarker({ item, type }) {
  const { t } = useLanguage();
  
  const lat = type === 'found' ? item.found_lat : item.last_seen_lat;
  const lng = type === 'found' ? item.found_lng : item.last_seen_lng;
  const linkTo = type === 'found' ? `/found-items/${item.id}` : `/lost-reports/${item.id}`;

  if (!lat || !lng) return null;

  return (
    <Marker position={[lat, lng]} icon={type === 'found' ? foundIcon : lostIcon}>
      <Popup className="custom-popup min-w-[200px]">
        <div className="p-1">
          <div className="flex gap-2 items-center mb-2">
            <Badge variant={type === 'found' ? 'green' : 'red'}>
              {type === 'found' ? 'Found' : 'Lost'}
            </Badge>
            <CategoryBadge category={item.category} />
          </div>
          <h4 className="font-semibold text-text mb-1">{item.title}</h4>
          <p className="text-sm text-muted line-clamp-2 mb-3">{item.description}</p>
          <Link to={linkTo} className="text-sm text-primary font-medium hover:underline block text-center border border-primary/20 rounded py-1.5 bg-primary/5">
            View Details
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}
