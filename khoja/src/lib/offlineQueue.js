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

export async function syncDrafts(supabase) {
  const drafts = await getDrafts();
  const results = [];

  for (const draft of drafts) {
    try {
      const table = draft.type === 'found_item' ? 'found_items' : 'loss_reports';
      const { error } = await supabase.from(table).insert(draft.data);
      if (!error) {
        await deleteDraft(draft.id);
        results.push({ id: draft.id, status: 'synced' });
      } else {
        results.push({ id: draft.id, status: 'failed', error });
      }
    } catch (err) {
      results.push({ id: draft.id, status: 'failed', error: err });
    }
  }

  return results;
}