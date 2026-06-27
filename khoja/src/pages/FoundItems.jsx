import { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useFoundItems } from '../hooks/useFoundItems';
import { useFoundItemsRealtime } from '../hooks/useRealtime';
import ItemGrid from '../components/items/ItemGrid';
import MapView from '../components/map/MapView';
import Spinner from '../components/ui/Spinner';
import { Search, Map as MapIcon, Grid, ChevronDown } from 'lucide-react';

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

function sortItems(items, sortBy) {
  const copy = [...items];
  switch (sortBy) {
    case 'oldest':
      return copy.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'category':
      return copy.sort((a, b) =>
        (a.category || '').localeCompare(b.category || '') ||
        new Date(b.created_at) - new Date(a.created_at)
      );
    case 'title':
      return copy.sort((a, b) =>
        (a.title || '').localeCompare(b.title || '')
      );
    case 'newest':
    default:
      return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

/**
 * Group items by category for the "category" sort view.
 * Returns an ordered array of { category, items[] }.
 */
function groupByCategory(items) {
  const map = {};
  for (const item of items) {
    const key = item.category || 'other';
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, catItems]) => ({ category, items: catItems }));
}

export default function FoundItems() {
  const { t } = useLanguage();
  const { items, loading, error, refetch } = useFoundItems();
  const [searchQuery, setSearchQuery]     = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy]               = useState('newest');
  const [viewMode, setViewMode]           = useState('grid'); // 'grid' | 'map'

  useFoundItemsRealtime(() => refetch());

  const filteredAndSorted = useMemo(() => {
    const search = searchQuery.toLowerCase();
    const filtered = items.filter(item => {
      const matchesSearch =
        (item.title || '').toLowerCase().includes(search) ||
        (item.description || '').toLowerCase().includes(search);
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus   = item.status === 'unclaimed' || item.status === 'matched';
      return matchesSearch && matchesCategory && matchesStatus;
    });
    return sortItems(filtered, sortBy);
  }, [items, searchQuery, categoryFilter, sortBy]);

  const grouped = useMemo(
    () => sortBy === 'category' ? groupByCategory(filteredAndSorted) : null,
    [filteredAndSorted, sortBy]
  );

  if (loading && items.length === 0) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text">{t('nav.found')}</h1>
          <p className="text-muted mt-2">
            Browse items found by others.{' '}
            <span className="text-text font-medium">{filteredAndSorted.length}</span>{' '}
            {filteredAndSorted.length === 1 ? 'result' : 'results'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-border">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md flex items-center transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-bg text-primary shadow-sm' : 'text-muted hover:text-text'}`}
          >
            <Grid size={20} />
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
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          />
        </div>

        {/* Category filter */}
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

        {/* Sort */}
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

      {/* Category quick-jump pills (shown when categoryFilter is 'all') */}
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
      {viewMode === 'grid' ? (
        grouped ? (
          // Grouped by category view
          <div className="space-y-10">
            {grouped.length === 0 && (
              <div className="text-center py-12 bg-surface rounded-xl border border-border">
                <p className="text-muted">No found items match your criteria.</p>
              </div>
            )}
            {grouped.map(({ category, items: catItems }) => (
              <section key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-text capitalize">
                    {t(`cat.${category}`) || category}
                  </h2>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {catItems.length}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <ItemGrid items={catItems} emptyMessage="" />
              </section>
            ))}
          </div>
        ) : (
          <ItemGrid items={filteredAndSorted} emptyMessage="No found items match your criteria." />
        )
      ) : (
        <div className="h-[600px] rounded-xl overflow-hidden border border-border relative z-0">
          <MapView foundItems={filteredAndSorted} />
        </div>
      )}
    </div>
  );
}
