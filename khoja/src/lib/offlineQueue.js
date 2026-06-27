/* eslint-disable no-unused-vars */
import { openDB } from 'idb';

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

  if (onProgress) onProgress(results);

  for (const draft of drafts) {
    try {
      const table = draft.type === 'found_item' ? 'found_items' : 'loss_reports';
      const { error } = await supabase.from(table).insert(draft.data);
      if (!error) {
        await deleteDraft(draft.id);
        results.succeeded++;
      } else {
        results.failed++;
      }
    } catch (err) {
      results.failed++;
    }
    
    results.done++;
    if (onProgress) onProgress(results);
  }

  return { succeeded: results.succeeded, failed: results.failed };
}