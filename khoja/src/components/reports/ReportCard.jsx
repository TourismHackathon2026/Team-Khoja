import { Link } from 'react-router-dom';
import { MapPin, Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { safeFormatDistanceToNow } from '../../lib/dateUtils';
import CategoryBadge from '../items/CategoryBadge';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function ReportCard({ report }) {
  const { t } = useLanguage();
  
  const statusColors = {
    searching: 'amber',
    matched: 'blue',
    recovered: 'green',
    closed: 'gray'
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-5 hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex justify-between items-start mb-3">
        <CategoryBadge category={report.category} />
        <Badge variant={statusColors[report.status] || 'gray'}>
          {t(`status.${report.status}`)}
        </Badge>
      </div>
      
      <h3 className="font-heading font-semibold text-lg text-text mb-2 line-clamp-1">{report.title}</h3>
      <p className="text-muted text-sm line-clamp-3 mb-4 flex-grow">{report.description}</p>
      
      <div className="space-y-2 mb-5 text-sm text-muted bg-bg p-3 rounded-lg">
        <div className="flex items-start">
          <MapPin size={16} className="mr-1.5 mt-0.5 shrink-0 text-lost" />
          <span className="line-clamp-2">Last seen: {report.last_seen_location || 'Unknown'}</span>
        </div>
        <div className="flex items-center">
          <Clock size={16} className="mr-1.5 shrink-0" />
          <span>Reported {safeFormatDistanceToNow(report.created_at)}</span>
        </div>
      </div>
      
      <Link to={`/lost-reports/${report.id}`} className="mt-auto">
        <Button variant="secondary" className="w-full">View Details</Button>
      </Link>
    </div>
  );
}
