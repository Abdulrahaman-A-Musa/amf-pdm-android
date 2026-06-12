import { useState, useCallback } from 'react';
import { DataRow } from '../types';
import { KOBO_DATASETS, KOBO_BASE } from '../config/kobo';

export type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SyncState {
  status: SyncStatus;
  error?: string;
  lastSync?: Date;
  count?: number;
  fromCache?: boolean;
}

// ── IndexedDB cache ───────────────────────────────────────────────────────────

interface CacheEntry {
  data: DataRow[];
  syncedAt: string;
}

const DB_NAME = 'amf_pdm_cache';
const STORE   = 'kobo_data';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function cacheGet(key: string): Promise<CacheEntry | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as CacheEntry) ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch { return null; }
}

async function cacheSet(key: string, entry: CacheEntry): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry, key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch { /* non-fatal */ }
}

// ── Request builder ───────────────────────────────────────────────────────────
// Two modes:
//   Proxy mode  — VITE_PROXY_URL is set  → route via proxy (token hidden server-side)
//   Direct mode — VITE_KOBO_TOKEN is set → call KoBoToolbox API directly (Android)

const PROXY_BASE  = (import.meta.env.VITE_PROXY_URL  as string | undefined)?.trim() || '';
const KOBO_TOKEN  = (import.meta.env.VITE_KOBO_TOKEN as string | undefined)?.trim() || '';

function buildFetchArgs(url: string): [string, RequestInit] {
  if (PROXY_BASE) {
    return [`${PROXY_BASE}?url=${encodeURIComponent(url)}`, {}];
  }
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (KOBO_TOKEN) headers['Authorization'] = `Token ${KOBO_TOKEN}`;
  return [url, { headers }];
}

// ── KoBoToolbox JSON data fetch with pagination ───────────────────────────────

function normalizeRow(raw: Record<string, unknown>): DataRow {
  const row: DataRow = {};
  for (const [key, val] of Object.entries(raw)) {
    row[key] = coerce(val);
    if (key.includes('/')) {
      const short = key.split('/').pop()!;
      if (!(short in row)) row[short] = coerce(val);
    }
  }
  return row;
}

function coerce(val: unknown): string | number | boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
  if (Array.isArray(val)) return val.join(' ');
  return String(val);
}

async function fetchAllPages(assetId: string): Promise<DataRow[]> {
  const all: DataRow[] = [];
  let url: string | null =
    `${KOBO_BASE}/api/v2/assets/${assetId}/data/?format=json&limit=30000`;

  while (url) {
    const [fetchUrl, fetchInit] = buildFetchArgs(url);
    let res: Response;
    try {
      res = await fetch(fetchUrl, fetchInit);
    } catch {
      if (PROXY_BASE) {
        throw new Error(
          'Cannot reach the proxy server. ' +
          'Make sure kobo_proxy_server.py is running or the Render proxy service is live.'
        );
      }
      throw new Error(
        'Cannot reach KoBoToolbox. Check your internet connection and try again.'
      );
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json = await res.json() as { results?: Record<string, unknown>[]; next?: string | null };
    (json.results ?? []).forEach(r => all.push(normalizeRow(r)));
    url = json.next ?? null;
  }

  return all;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useKoboSync() {
  const [mainState,    setMainState]    = useState<SyncState>({ status: 'idle' });
  const [revisitState, setRevisitState] = useState<SyncState>({ status: 'idle' });

  const syncMain = useCallback(async (forceRefresh = false): Promise<DataRow[] | null> => {
    const { assetId } = KOBO_DATASETS.main;
    if (!assetId) return null;
    setMainState({ status: 'loading' });

    if (!forceRefresh) {
      const cached = await cacheGet('kobo_main');
      if (cached) {
        setMainState({ status: 'success', lastSync: new Date(cached.syncedAt), count: cached.data.length, fromCache: true });
        return cached.data;
      }
    }

    try {
      const rows = await fetchAllPages(assetId);
      const now  = new Date();
      await cacheSet('kobo_main', { data: rows, syncedAt: now.toISOString() });
      setMainState({ status: 'success', lastSync: now, count: rows.length, fromCache: false });
      return rows;
    } catch (e) {
      setMainState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }, []);

  const syncRevisit = useCallback(async (forceRefresh = false): Promise<DataRow[] | null> => {
    const { assetId } = KOBO_DATASETS.revisit;
    if (!assetId) return null;
    setRevisitState({ status: 'loading' });

    if (!forceRefresh) {
      const cached = await cacheGet('kobo_revisit');
      if (cached) {
        setRevisitState({ status: 'success', lastSync: new Date(cached.syncedAt), count: cached.data.length, fromCache: true });
        return cached.data;
      }
    }

    try {
      const rows = await fetchAllPages(assetId);
      const now  = new Date();
      await cacheSet('kobo_revisit', { data: rows, syncedAt: now.toISOString() });
      setRevisitState({ status: 'success', lastSync: now, count: rows.length, fromCache: false });
      return rows;
    } catch (e) {
      setRevisitState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }, []);

  return { mainState, revisitState, syncMain, syncRevisit };
}
