import { openDB } from 'idb';
import { generateClaimCode } from './generateClaimCode';

const DB_NAME = 'khoja-offline';
const STORE = 'drafts';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    }
  });
}

export async function saveDraft(type, data) {
  const db = await getDB();
  return db.add(STORE, { type, data, savedAt: new Date().toISOString() });
}

export async function getDrafts() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function deleteDraft(id) {
  const db = await getDB();
  return db.delete(STORE, id);
}

export async function syncDrafts(supabase, onProgress) {
  const drafts = await getDrafts();
  const results = { succeeded: 0, failed: 0, total: drafts.length, done: 0 };

  if (onProgress) onProgress({ ...results });
  if (drafts.length === 0) return { succeeded: 0, failed: 0 };

  for (const draft of drafts) {
    try {
      const table = draft.type === 'found_item' ? 'found_items' : 'loss_reports';

      // found_item drafts saved offline have claim_code: null — generate one now
      const payload = { ...draft.data };
      if (draft.type === 'found_item' && !payload.claim_code) {
        payload.claim_code = generateClaimCode();
      }

      const { error } = await supabase.from(table).insert(payload);

      if (error) {
        console.error(`Sync failed for draft ${draft.id}:`, error.message);
        results.failed++;
      } else {
        await deleteDraft(draft.id);
        results.succeeded++;
      }
    } catch (err) {
      console.error(`Unexpected sync error for draft ${draft.id}:`, err);
      results.failed++;
    }

    results.done++;
    if (onProgress) onProgress({ ...results });
  }

  return { succeeded: results.succeeded, failed: results.failed };
}
