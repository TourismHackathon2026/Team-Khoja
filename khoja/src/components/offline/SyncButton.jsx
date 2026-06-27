import { useEffect, useState } from 'react';
import { getDrafts } from '../../lib/offlineQueue';
import { useOnlineStatus } from '../../lib/useOnlineStatus';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { RefreshCw } from 'lucide-react';

export default function SyncButton() {
  const [draftCount, setDraftCount] = useState(0);
  const { isOnline, isSyncing, syncResult, triggerSync } = useOnlineStatus();
  const { t } = useLanguage();

  const refreshCount = async () => {
    const drafts = await getDrafts();
    setDraftCount(drafts.length);
  };

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Re-check count after every sync attempt finishes
  useEffect(() => {
    if (!isSyncing && syncResult !== null) {
      refreshCount();
    }
  }, [isSyncing, syncResult]);

  if (draftCount === 0) return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={triggerSync}
      disabled={!isOnline || isSyncing}
      className="relative"
    >
      <RefreshCw size={16} className={isSyncing ? 'animate-spin mr-2' : 'mr-2'} />
      <span className="hidden sm:inline">
        {isSyncing ? 'Syncing...' : (t('offline.sync') || 'Sync')}
      </span>
      <Badge variant="primary" className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px]">
        {draftCount}
      </Badge>
    </Button>
  );
}
