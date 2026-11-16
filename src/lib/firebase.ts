/**
 * Database adapter voor Queens & Ko.nl
 * Praat met /api/database.php (TransIP MySQL in productie, lokale/proxy handler in dev).
 * Behoudt de Firestore-achtige interface zodat alle componenten naadloos blijven werken.
 */

const API_BASE = '/api/database.php';

export const db = {
  type: 'transip_mysql_bridge',
};

export class MockDocRef {
  type = 'document_reference' as const;
  constructor(public collectionId: string, public docId: string) {}
}

export class MockCollectionRef {
  type = 'collection_reference' as const;
  constructor(public collectionId: string) {}
}

export function doc(_dbInstance: any, collectionId: string, docId: string) {
  return new MockDocRef(collectionId, docId);
}

export function collection(_dbInstance: any, collectionId: string) {
  return new MockCollectionRef(collectionId);
}

export function query(collectionRef: any, ..._args: any[]) {
  return collectionRef;
}

export function where(..._args: any[]) {
  return { type: 'where' };
}

export function orderBy(..._args: any[]) {
  return { type: 'orderBy' };
}

export function limit(..._args: any[]) {
  return { type: 'limit' };
}

export async function setDoc(docRef: MockDocRef, data: any) {
  const url = `${API_BASE}?collection=${encodeURIComponent(docRef.collectionId)}&id=${encodeURIComponent(docRef.docId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, id: docRef.docId }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Database write failed (${res.status}): ${errText}`);
  }
  return { success: true };
}

export async function deleteDoc(docRef: MockDocRef) {
  const url = `${API_BASE}?collection=${encodeURIComponent(docRef.collectionId)}&id=${encodeURIComponent(docRef.docId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Database delete failed (${res.status}): ${errText}`);
  }
  return { success: true };
}

export async function getDocs(queryRef: MockCollectionRef) {
  const url = `${API_BASE}?collection=${encodeURIComponent(queryRef.collectionId)}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Database query failed (${res.status}): ${errText}`);
    }
    const items = (await res.json()) as any[];
    const list = Array.isArray(items) ? items : [];

    try {
      localStorage.setItem(`_db_cache_${queryRef.collectionId}`, JSON.stringify(list));
    } catch {
      // Ignore storage quota errors
    }

    return {
      docs: list.map((item: any) => ({
        id: item.id,
        data: () => item,
      })),
      size: list.length,
      empty: list.length === 0,
      _isCached: false,
    };
  } catch (err) {
    console.error(`[DB] getDocs error on ${queryRef.collectionId}:`, err);

    try {
      const cached = localStorage.getItem(`_db_cache_${queryRef.collectionId}`);
      if (cached) {
        const items = JSON.parse(cached);
        return {
          docs: items.map((item: any) => ({
            id: item.id,
            data: () => item,
          })),
          size: items.length,
          empty: items.length === 0,
          _isCached: true,
        };
      }
    } catch {
      // Ignore cache read error
    }

    throw err;
  }
}

export function onSnapshot(
  queryRef: MockCollectionRef,
  onNext: (snap: any) => void,
  onError?: (err: any) => void
) {
  let active = true;
  let currentDelay = 5000;

  async function poll() {
    while (active) {
      try {
        const snap = await getDocs(queryRef);
        if (active) {
          onNext(snap);
          currentDelay = snap._isCached ? Math.min(currentDelay * 1.5, 60000) : 5000;
        }
      } catch (err) {
        currentDelay = Math.min(currentDelay * 2, 60000);
        if (onError && active) {
          onError(err);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  }

  poll();

  return () => {
    active = false;
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(
  error: unknown,
  _operationType: OperationType,
  _path: string | null
) {
  console.error('[DB] Error:', error);
}
