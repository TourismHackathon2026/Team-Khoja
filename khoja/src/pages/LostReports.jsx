import { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useLossReports } from '../hooks/useLossReports';
import { useLossReportsRealtime } from '../hooks/useRealtime';
import ReportCard from '../components/reports/ReportCard';
import MapView from '../components/map/MapView';
import Spinner from '../components/ui/Spinner';
import { Search, Map as MapIcon, List, ChevronDown } from 'lucide-react';

const CATEGORIES = [
  'passport', 'camera', 'wallet', 'phone',
  'trekking_gear', 'bag', 'jewelry', 'keys', 'other',
];

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'category', label: 'Category (A–Z)' },
  { value: 'title',    label: 'Title (A–Z)' },
];

function sortReports(reports, sortBy) {
  const copy = [...reports];
  switch (sortBy) {
    case 'oldest':
      return copy.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'category':
      return copy.sort((a, b) =>
        (a.category || '').localeCompare(b.category || '') ||
        new Date(b.created_at) - new Date(a.created_at)
      );
    case 'title':
      return copy.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'newest':
    default:
      return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

function groupByCategory(reports) {
  const map = {};
  for (const r of reports) {
    const key = r.category || 'other';
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, catReports]) => ({ category, reports: catReports }));
}

export default function LostReports() {
  const { t } = useLanguage();
  const { reports, loading, error, refetch } = useLossReports();
  const [searchQuery, setSearchQuery]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy]                 = useState('newest');
  const [viewMode, setViewMode]             = useState('list');

  useLossReportsRealtime(() => refetch());

  const filteredAndSorted = useMemo(() => {
    const filtered = reports.filter(report => {
      const matchesSearch =
        (report.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
      const matchesStatus   = report.status === 'searching' || report.status === 'matched';
      return matchesSearch && matchesCategory && matchesStatus;
    });
    return sortReports(filtered, sortBy);
  }, [reports, searchQuery, categoryFilter, sortBy]);

  const grouped = useMemo(
    () => sortBy === 'category' ? groupByCategory(filteredAndSorted) : null,
    [filteredAndSorted, sortBy]
  );

  if (loading && reports.length === 0) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  const ReportGrid = ({ items }) =>
    items.length === 0 ? null : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(report => <ReportCard key={report.id} report={report} />)}
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text">{t('nav.reports')}</h1>
          <p className="text-muted mt-2">
            Help others find their lost items.{' '}
            <span className="text-text font-medium">{filteredAndSorted.length}</span>{' '}
            {filteredAndSorted.length === 1 ? 'result' : 'results'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-border">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md flex items-center transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-bg text-primary shadow-sm' : 'text-muted hover:text-text'}`}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`p-2 rounded-md flex items-center transition-colors cursor-pointer ${viewMode === 'map' ? 'bg-bg text-primary shadow-sm' : 'text-muted hover:text-text'}`}
          >
            <MapIcon size={20} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          />
        </div>

        <div className="relative w-full md:w-52">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer pr-8"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{t(`cat.${cat}`) || cat}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>

        <div className="relative w-full md:w-48">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer pr-8"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>

      {/* Category pills */}
      {categoryFilter === 'all' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface hover:border-primary hover:text-primary transition-colors cursor-pointer capitalize"
            >
              {t(`cat.${cat}`) || cat}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-8">{error}</div>
      )}

      {/* Results */}
      {viewMode === 'list' ? (
        grouped ? (
          <div className="space-y-10">
            {grouped.length === 0 && (
              <div className="text-center py-12 bg-surface rounded-xl border border-border">
                <p className="text-muted">No lost reports match your criteria.</p>
              </div>
            )}
            {grouped.map(({ category, reports: catReports }) => (
              <section key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-text capitalize">
                    {t(`cat.${category}`) || category}
                  </h2>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {catReports.length}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <ReportGrid items={catReports} />
              </section>
            ))}
          </div>
        ) : (
          filteredAndSorted.length > 0 ? (
            <ReportGrid items={filteredAndSorted} />
          ) : (
            <div className="text-center py-12 bg-surface rounded-xl border border-border">
              <p className="text-muted">No lost reports match your criteria.</p>
            </div>
          )
        )
      ) : (
        <div className="h-[600px] rounded-xl overflow-hidden border border-border relative z-0">
          <MapView lossReports={filteredAndSorted} />
        </div>
      )}
    </div>
  );
}
