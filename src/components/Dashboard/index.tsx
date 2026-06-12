import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Upload, AlertCircle, RefreshCw, FileText, Download, Wifi, WifiOff, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useKoboSync, SyncState } from '../../hooks/useKoboSync';
import { KOBO_DATASETS } from '../../config/kobo';

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [
    cols.join(','),
    ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
import { useAppStore } from '../../store/useAppStore';
import { readExcelFile, getUniqueValues } from '../../utils/excelUtils';
import { validateData } from '../../utils/dataValidation';
import { parseCommunityCSV } from '../../utils/communityTargetUtils';
import { DataRow } from '../../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString();
}

const END_COLS     = ['End of Survey','end','endtime','end_time','SubmissionDate','end_datetime'];
const ENUM_COLS    = ['username','interviewer_name','enumerator_name','enum_name','_submitted_by','enumerator'];
const REVISIT_COLS = ['marked_for_revisit','revisit_required','revisit','Revisit_Status'];
const CONSENT_COLS = ['consent','Consent','household_consent','q_consent','consent_given'];
const TARGET_COLS  = ['calc_target_hh','target_hh','assigned_hh','hh_target','household_target'];
const SPARE_COLS   = ['SpareHouseholdID','spare_household_id','calc_spare_household_display_number','spare_hh_id'];
const VILLAGE_COL  = 'calc_village_name';

function findCol(row: DataRow, candidates: string[]): string {
  return candidates.find(c => c in row) ?? '';
}

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const n = Number(val);
  if (!isNaN(n) && n > 40000 && n < 60000)
    return new Date(new Date(1899, 11, 30).getTime() + n * 86400000);
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

// ─── Gauge ────────────────────────────────────────────────────────────────────

function Gauge({ value, max, label }: { value: number; max: number; label: string }) {
  const pct   = max > 0 ? Math.min(value / max, 1) : 0;
  const angle = pct * 180;
  const r = 68, cx = 90, cy = 85;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const ax    = (d: number) => cx + r * Math.cos(toRad(180 - d));
  const ay    = (d: number) => cy - r * Math.sin(toRad(180 - d));
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 95" className="w-full max-w-[220px]">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke="#dbeafe" strokeWidth="18" strokeLinecap="round" />
        {angle > 0 && (
          <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 ${angle>180?1:0} 1 ${ax(angle)} ${ay(angle)}`}
            fill="none" stroke="#3b82f6" strokeWidth="18" strokeLinecap="round" />
        )}
        <text x={cx} y={cy-4} textAnchor="middle"
          style={{ fontSize: 18, fontWeight: 700, fill: '#1e3a8a' }}>{fmt(value)}</text>
        <text x={cx-r+4} y={cy+16} style={{ fontSize: 9, fill: '#94a3b8' }}>0</text>
        <text x={cx+r-12} y={cy+16} style={{ fontSize: 9, fill: '#94a3b8' }}>{fmt(max)}</text>
      </svg>
      <p className="text-xs text-slate-500 text-center -mt-1">{label}</p>
    </div>
  );
}

// ─── KPI box ──────────────────────────────────────────────────────────────────

function KpiBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl p-3 text-center shadow-sm border border-gray-200 bg-white flex flex-col justify-between min-h-[100px]">
      <p className="text-[11px] font-semibold leading-snug text-slate-500">{label}</p>
      <p className="text-[26px] font-bold text-[#1e3a8a] leading-none mt-2">{value}</p>
    </div>
  );
}

// ─── KoboSyncRow ─────────────────────────────────────────────────────────────

function KoboSyncRow({
  label, state, onSync, hasUrl,
}: {
  label: string;
  state: SyncState;
  onSync: (forceRefresh?: boolean) => void;
  hasUrl: boolean;
}) {
  const statusIcon = {
    idle:    <Wifi className="w-3 h-3 text-[#888]" />,
    loading: <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />,
    success: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
    error:   <XCircle className="w-3 h-3 text-red-400" />,
  }[state.status];

  return (
    <div className="flex items-start gap-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {statusIcon}
          <p className="text-[10px] font-semibold text-[#ccc]">{label} Survey</p>
        </div>
        {state.status === 'success' && (
          <p className="text-[9px] text-[#888] leading-tight mt-0.5">
            {state.count?.toLocaleString()} rows
            {state.fromCache ? ' · cached' : ' · live'}
            {' · '}{state.lastSync?.toLocaleTimeString()}
          </p>
        )}
        {state.status === 'loading' && (
          <p className="text-[9px] text-amber-400 leading-tight mt-0.5 animate-pulse">Fetching…</p>
        )}
        {state.status === 'error' && (
          <p className="text-[9px] text-red-400 leading-tight mt-0.5 break-words">{state.error}</p>
        )}
        {state.status === 'idle' && hasUrl && (
          <p className="text-[9px] text-[#777] leading-tight mt-0.5">Click ↻ to sync</p>
        )}
        {!hasUrl && (
          <p className="text-[9px] text-[#666] leading-tight mt-0.5">URL not configured</p>
        )}
      </div>
      <button
        onClick={() => onSync(true)}
        disabled={!hasUrl || state.status === 'loading'}
        title={`Fetch latest ${label} data from KoBoToolbox`}
        className="mt-0.5 flex items-center justify-center w-6 h-6 rounded bg-[#444] hover:bg-[#555] disabled:opacity-30 transition-colors shrink-0"
      >
        <RefreshCw className={`w-3 h-3 text-[#ccc] ${state.status === 'loading' ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const {
    mainData, revisitData, validationData,
    setMainData, setRevisitData, setValidationData, setProcessing,
    selectedState, communityTargets, setCommunityTargets,
  } = useAppStore();

  const { mainState, revisitState, syncMain, syncRevisit } = useKoboSync();
  const hasKoboMain    = !!KOBO_DATASETS.main.assetId;
  const hasKoboRevisit = !!KOBO_DATASETS.revisit.assetId;
  const [syncMode, setSyncMode] = useState<'kobo' | 'upload'>(
    hasKoboMain || hasKoboRevisit ? 'kobo' : 'upload'
  );
  const autoSynced = useRef(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode]               = useState<'main' | 'revisit'>('main');
  const [lgaFilter, setLgaFilter]     = useState('All');
  const [wardFilter, setWardFilter]   = useState('All');
  const [villageFilter, setVillageFilter] = useState('All');
  const [enumFilter, setEnumFilter]   = useState('All');
  const [raFilter, setRaFilter]       = useState<'all' | 'meet' | 'below'>('all');

  useEffect(() => {
    if (mainData && !validationData) {
      setProcessing(true);
      setTimeout(() => {
        try { setValidationData(validateData(mainData as DataRow[])); } catch {}
        setProcessing(false);
      }, 50);
    }
  }, [mainData]);

  const rawData = mode === 'main' ? mainData : revisitData;

  const stateTargets = useMemo(() => communityTargets[selectedState] ?? [], [communityTargets, selectedState]);

  const targetLookup = useMemo(() => {
    const map: Record<string, number> = {};
    stateTargets.forEach(ct => {
      const key = `${ct.lga.toUpperCase().trim()}||${ct.community.toUpperCase().trim()}`;
      map[key] = ct.target;
    });
    return map;
  }, [stateTargets]);

  const cols = useMemo(() => {
    if (!rawData?.length) return { date: '', enum: '', revisit: '', consent: '', target: '' };
    const r = rawData[0];
    return {
      date:    findCol(r, END_COLS),
      enum:    findCol(r, ENUM_COLS),
      revisit: findCol(r, REVISIT_COLS),
      consent: findCol(r, CONSENT_COLS),
      target:  findCol(r, TARGET_COLS),
    };
  }, [rawData]);

  const lgaOpts = useMemo(() =>
    rawData ? ['All', ...getUniqueValues(rawData, 'calc_l4_name')] : ['All'],
  [rawData]);

  const wardOpts = useMemo(() => {
    if (!rawData) return ['All'];
    const src = lgaFilter !== 'All'
      ? rawData.filter(r => String(r['calc_l4_name'] ?? '') === lgaFilter) : rawData;
    return ['All', ...getUniqueValues(src, 'calc_l3_name')];
  }, [rawData, lgaFilter]);

  const villageOpts = useMemo(() => {
    if (!rawData) return ['All'];
    let src = rawData;
    if (lgaFilter  !== 'All') src = src.filter(r => String(r['calc_l4_name'] ?? '') === lgaFilter);
    if (wardFilter !== 'All') src = src.filter(r => String(r['calc_l3_name'] ?? '') === wardFilter);
    return ['All', ...getUniqueValues(src, VILLAGE_COL)];
  }, [rawData, lgaFilter, wardFilter]);

  const enumOpts = useMemo(() =>
    rawData && cols.enum ? ['All', ...getUniqueValues(rawData, cols.enum)] : ['All'],
  [rawData, cols.enum]);

  const data = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter(r => {
      if (lgaFilter     !== 'All' && String(r['calc_l4_name'] ?? '') !== lgaFilter)     return false;
      if (wardFilter    !== 'All' && String(r['calc_l3_name'] ?? '') !== wardFilter)    return false;
      if (villageFilter !== 'All' && String(r[VILLAGE_COL]   ?? '') !== villageFilter)  return false;
      if (enumFilter    !== 'All' && cols.enum &&
          String(r[cols.enum] ?? '') !== enumFilter) return false;
      return true;
    });
  }, [rawData, lgaFilter, wardFilter, villageFilter, enumFilter, cols.enum]);

  const cleanData = useMemo(() => {
    if (!data.length) return [];
    const filtered = data.filter(r => {
      if ('no_cannot_find' in r) {
        if (String(r['no_cannot_find'] ?? '') !== 'HouseholdFound') return false;
      }
      if ('FirstVisitPresent' in r) {
        if (String(r['FirstVisitPresent'] ?? '') === 'no_permanently_absent') return false;
      }
      if (cols.consent) {
        if (String(r[cols.consent] ?? '').toLowerCase() === 'no') return false;
      }
      return true;
    });
    const seen = new Set<string>();
    return filtered.filter(r => {
      const id = String(r['calc_household_id'] ?? '').trim();
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [data, cols.consent]);

  const totalHH = data.length;
  const cleanHH = cleanData.length;

  const uniqueSettlements = useMemo(() =>
    new Set(data.map(r => String(r[VILLAGE_COL] ?? '')).filter(Boolean)).size,
  [data]);

  const communitySubmissions = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(r => {
      const lga  = String(r['calc_l4_name'] ?? '').toUpperCase().trim();
      const comm = String(r[VILLAGE_COL]   ?? '').toUpperCase().trim();
      if (!comm) return;
      const key = `${lga}||${comm}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [data]);

  const settlementsComplete = useMemo(() => {
    if (!stateTargets.length) return null;
    return stateTargets.filter(ct => {
      const key = `${ct.lga.toUpperCase().trim()}||${ct.community.toUpperCase().trim()}`;
      return (communitySubmissions[key] ?? 0) >= ct.target && ct.target > 0;
    }).length;
  }, [stateTargets, communitySubmissions]);

  const settlementsIncomplete = useMemo(() => {
    if (!stateTargets.length) return 0;
    return stateTargets.filter(ct => {
      const key   = `${ct.lga.toUpperCase().trim()}||${ct.community.toUpperCase().trim()}`;
      const count = communitySubmissions[key] ?? 0;
      return count > 0 && count < ct.target;
    }).length;
  }, [stateTargets, communitySubmissions]);

  const settlementsUnreached = useMemo(() => {
    if (!stateTargets.length) return 0;
    return stateTargets.filter(ct => {
      const key = `${ct.lga.toUpperCase().trim()}||${ct.community.toUpperCase().trim()}`;
      return (communitySubmissions[key] ?? 0) === 0;
    }).length;
  }, [stateTargets, communitySubmissions]);

  const totalSpares = useMemo(() => {
    if (!data.length) return 0;
    const spareCol = SPARE_COLS.find(c => c in data[0]);
    if (!spareCol) return 0;
    return data.filter(r => {
      const v = r[spareCol];
      return v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0';
    }).length;
  }, [data]);

  const uniqueEnumerators = useMemo(() =>
    cols.enum
      ? new Set(data.map(r => String(r[cols.enum] ?? '')).filter(Boolean)).size
      : 0,
  [data, cols.enum]);

  const revisitMarked = useMemo(() => {
    if (!cols.revisit) return 0;
    return data.filter(r => {
      const v = String(r[cols.revisit] ?? '').toUpperCase();
      return v === 'YES' || v === '1' || v === 'TRUE';
    }).length;
  }, [data, cols.revisit]);

  const dailyData = useMemo(() => {
    if (!data.length || !cols.date) return [];
    const counts: Record<string, number> = {};
    data.forEach(r => {
      const d = parseDate(r[cols.date]);
      if (!d) return;
      const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => (parseDate(a[0])?.getTime() ?? 0) - (parseDate(b[0])?.getTime() ?? 0))
      .map(([date, count]) => ({ date, count }));
  }, [data, cols.date]);

  const lgaData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(r => {
      const lga = String(r['calc_l4_name'] ?? 'Unknown');
      counts[lga] = (counts[lga] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([lga, collected]) => ({ lga, collected }));
  }, [data]);

  const raRows = useMemo(() => {
    if (!data.length || !cols.enum) return [];

    type RAAccum = {
      lga: string;
      ra: string;
      done: number;
      communities: Set<string>;
      fallbackTarget: number | null;
    };
    const map: Record<string, RAAccum> = {};

    cleanData.forEach(r => {
      const ra      = String(r[cols.enum] ?? '').trim();
      const lga     = String(r['calc_l4_name'] ?? '').trim();
      const comm    = String(r[VILLAGE_COL] ?? '').trim();
      if (!ra) return;
      const key = `${lga}||${ra}`;
      if (!map[key]) map[key] = { lga, ra, done: 0, communities: new Set(), fallbackTarget: null };
      map[key].done++;
      if (comm) {
        map[key].communities.add(`${lga.toUpperCase().trim()}||${comm.toUpperCase().trim()}`);
      }
      if (!stateTargets.length && cols.target) {
        const t = Number(r[cols.target]);
        if (!isNaN(t) && t > 0) map[key].fallbackTarget = t;
      }
    });

    return Object.values(map)
      .map(row => {
        let target: number | null = null;
        if (stateTargets.length) {
          let sum = 0;
          row.communities.forEach(commKey => {
            sum += targetLookup[commKey] ?? 0;
          });
          if (sum > 0) target = sum;
        } else {
          target = row.fallbackTarget;
        }
        return { lga: row.lga, ra: row.ra, done: row.done, target };
      })
      .sort((a, b) => a.lga.localeCompare(b.lga) || a.ra.localeCompare(b.ra));
  }, [cleanData, cols.enum, cols.target, stateTargets, targetLookup]);

  const raMeetCount  = useMemo(() => raRows.filter(r => r.target !== null && r.done >= r.target).length, [raRows]);
  const raBelowCount = useMemo(() => raRows.filter(r => r.target !== null && r.done < r.target).length, [raRows]);

  const displayRaRows = useMemo(() => {
    if (raFilter === 'all') return raRows;
    return raRows.filter(r => {
      if (r.target === null) return raFilter === 'below';
      return raFilter === 'meet' ? r.done >= r.target : r.done < r.target;
    });
  }, [raRows, raFilter]);

  const handleTargetUpload = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseCommunityCSV(text);
      if (parsed.length === 0) {
        alert('No valid communities found in the file. Check the CSV format.');
        return;
      }
      setCommunityTargets(selectedState, parsed);
    } catch {
      alert('Failed to read community target file.');
    }
  }, [selectedState, setCommunityTargets]);

  const handleUpload = useCallback(async (file: File, type: 'main' | 'revisit') => {
    try {
      const rows = await readExcelFile(file);
      if (type === 'main') {
        setMainData(rows);
        setProcessing(true);
        setTimeout(() => {
          try { setValidationData(validateData(rows as DataRow[])); } catch {}
          setProcessing(false);
        }, 50);
      } else {
        setRevisitData(rows);
      }
    } catch { alert('Failed to read file.'); }
  }, [setMainData, setRevisitData, setValidationData, setProcessing]);

  const handleSyncMain = useCallback(async (forceRefresh = false) => {
    const rows = await syncMain(forceRefresh);
    if (rows) setMainData(rows as DataRow[]);
  }, [syncMain, setMainData]);

  const handleSyncRevisit = useCallback(async (forceRefresh = false) => {
    const rows = await syncRevisit(forceRefresh);
    if (rows) setRevisitData(rows as DataRow[]);
  }, [syncRevisit, setRevisitData]);

  useEffect(() => {
    if (autoSynced.current) return;
    autoSynced.current = true;
    if (syncMode !== 'kobo') return;
    if (hasKoboMain    && !mainData)    handleSyncMain();
    if (hasKoboRevisit && !revisitData) handleSyncRevisit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (m: 'main' | 'revisit') => {
    setMode(m);
    setLgaFilter('All'); setWardFilter('All'); setVillageFilter('All'); setEnumFilter('All');
  };

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!mainData && !revisitData) {

    if (syncMode === 'kobo' && (hasKoboMain || hasKoboRevisit)) {
      const anyLoading = mainState.status === 'loading' || revisitState.status === 'loading';
      const anyError   = mainState.status === 'error'   || revisitState.status === 'error';
      const fromCache  = mainState.fromCache || revisitState.fromCache;

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
          {anyLoading ? (
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Wifi className="w-10 h-10 text-blue-400 opacity-70" />
              </div>
            </div>
          ) : anyError ? (
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
              <Wifi className="w-12 h-12 text-blue-400" />
            </div>
          )}

          <div className="max-w-md space-y-2">
            <p className="text-slate-800 font-bold text-2xl">
              {anyLoading
                ? (fromCache ? 'Loading cached data…' : 'Fetching survey data…')
                : anyError
                ? 'Unable to load data'
                : 'Connecting to KoBoToolbox…'}
            </p>
            {anyLoading && !fromCache && (
              <p className="text-slate-400 text-sm leading-relaxed">
                Downloading the latest data from KoBoToolbox.<br />
                Large datasets may take a few minutes — please keep this tab open.
              </p>
            )}
            {anyLoading && fromCache && (
              <p className="text-slate-400 text-sm">
                Restoring your previously downloaded data. This only takes a moment.
              </p>
            )}
            {!anyLoading && !anyError && (
              <p className="text-slate-400 text-sm">Starting data sync…</p>
            )}
            {anyError && (
              <div className="mt-2 space-y-1.5">
                {mainState.status === 'error' && (
                  <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 text-left">
                    <strong>Main:</strong> {mainState.error}
                  </p>
                )}
                {revisitState.status === 'error' && (
                  <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 text-left">
                    <strong>Revisit:</strong> {revisitState.error}
                  </p>
                )}
                <button
                  onClick={() => { handleSyncMain(true); handleSyncRevisit(true); }}
                  className="btn-primary mt-1 flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            {hasKoboMain && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm">
                {mainState.status === 'loading'
                  ? <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  : mainState.status === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  : mainState.status === 'error'
                  ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                  : <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin" />}
                <span className="text-sm text-slate-600 font-medium">Main Survey</span>
                {mainState.count != null && (
                  <span className="text-xs text-slate-400">{mainState.count.toLocaleString()} rows</span>
                )}
              </div>
            )}
            {hasKoboRevisit && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm">
                {revisitState.status === 'loading'
                  ? <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  : revisitState.status === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  : revisitState.status === 'error'
                  ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                  : <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin" />}
                <span className="text-sm text-slate-600 font-medium">Revisit Survey</span>
                {revisitState.count != null && (
                  <span className="text-xs text-slate-400">{revisitState.count.toLocaleString()} rows</span>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4 px-4">
        <AlertCircle className="w-14 h-14 text-slate-300" />
        <p className="text-slate-600 font-semibold text-lg">No data loaded yet</p>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          Upload your survey Excel files below, or go to Data Comparison / Data Quality tabs.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 w-full max-w-md">
          {(['main', 'revisit'] as const).map(t => (
            <label key={t} className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
              <Upload className="w-6 h-6 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Upload {t === 'main' ? 'Main' : 'Revisit'} Data</span>
              <span className="text-xs text-slate-400">.xlsx / .xls</span>
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], t)} />
            </label>
          ))}
        </div>
      </div>
    );
  }

  const CHART_COLORS = ['#1e3a8a','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe'];

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 7rem)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? 'w-44' : 'w-8'} shrink-0 bg-[#3c3c3c] flex flex-col select-none transition-[width] duration-200`}>

        {/* Toggle button — always visible */}
        <button
          onClick={() => setSidebarOpen(s => !s)}
          title={sidebarOpen ? 'Collapse panel' : 'Expand panel'}
          className="h-8 flex items-center justify-center hover:bg-[#555] transition-colors text-[#aaa] shrink-0"
        >
          {sidebarOpen
            ? <ChevronLeft className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>

        {sidebarOpen && (<>

        {/* ── Main / Revisit toggle ─────────────────────────────── */}
        <div className="p-3 pb-0">
          <div className="flex rounded-lg overflow-hidden border border-[#555] text-[11px] font-bold">
            <button
              onClick={() => switchMode('main')}
              className={`flex-1 py-2 tracking-widest transition-colors ${
                mode === 'main' ? 'bg-black text-white' : 'bg-[#444] text-[#aaa] hover:bg-[#555]'
              }`}
            >
              MAIN
            </button>
            <button
              onClick={() => revisitData && switchMode('revisit')}
              disabled={!revisitData}
              title={!revisitData ? 'Load revisit data to enable' : undefined}
              className={`flex-1 py-2 tracking-widest transition-colors ${
                !revisitData
                  ? 'bg-[#333] text-[#555] cursor-not-allowed'
                  : mode === 'revisit'
                  ? 'bg-black text-white'
                  : 'bg-[#444] text-[#aaa] hover:bg-[#555]'
              }`}
            >
              REVISIT
            </button>
          </div>
        </div>

        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          {[
            { label: 'LGA',                val: lgaFilter,     opts: lgaOpts,
              set: (v: string) => { setLgaFilter(v); setWardFilter('All'); setVillageFilter('All'); } },
            { label: 'Ward',               val: wardFilter,    opts: wardOpts,
              set: (v: string) => { setWardFilter(v); setVillageFilter('All'); } },
            { label: 'Village/Settlement', val: villageFilter, opts: villageOpts, set: setVillageFilter },
            ...(cols.enum ? [{ label: 'Enumerator', val: enumFilter, opts: enumOpts, set: setEnumFilter }] : []),
          ].map(({ label, val, opts, set }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold text-[#aaa] uppercase mb-1">{label}</p>
              <select value={val} onChange={e => set(e.target.value)}
                className="w-full text-[11px] bg-[#555] text-white border border-[#666] rounded px-1.5 py-1 focus:outline-none">
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}

          {/* Community target file upload */}
          <div className="pt-1">
            <p className="text-[10px] font-semibold text-[#aaa] uppercase mb-1">
              Community Targets ({selectedState})
            </p>
            <label className="flex items-center gap-1.5 cursor-pointer w-full py-1.5 px-2 bg-amber-700 hover:bg-amber-600 text-white text-[11px] rounded">
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {stateTargets.length > 0
                  ? `${stateTargets.length} communities`
                  : 'Import Target CSV'}
              </span>
              <input type="file" accept=".csv" className="hidden"
                onChange={e => e.target.files?.[0] && handleTargetUpload(e.target.files[0])} />
            </label>
            {stateTargets.length > 0 && (
              <p className="text-[9px] text-[#888] mt-1 leading-snug">
                Click to replace for {selectedState}
              </p>
            )}
          </div>

          {/* ── Data source toggle ──────────────────────────────── */}
          <div className="pt-2">
            <p className="text-[10px] font-semibold text-[#aaa] uppercase mb-1.5">Data Source</p>
            <div className="flex rounded-lg overflow-hidden border border-[#555] text-[11px] font-semibold">
              <button
                onClick={() => setSyncMode('kobo')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 transition-colors ${
                  syncMode === 'kobo'
                    ? 'bg-amber-700 text-white'
                    : 'bg-[#444] text-[#aaa] hover:bg-[#555]'
                }`}
              >
                <Wifi className="w-3 h-3" /> KoBoSync
              </button>
              <button
                onClick={() => setSyncMode('upload')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 transition-colors ${
                  syncMode === 'upload'
                    ? 'bg-[#666] text-white'
                    : 'bg-[#444] text-[#aaa] hover:bg-[#555]'
                }`}
              >
                <WifiOff className="w-3 h-3" /> Upload
              </button>
            </div>
          </div>

          {/* ── KoBoSync status rows ─────────────────────────────── */}
          {syncMode === 'kobo' && (
            <div className="pt-1 space-y-2.5">
              <KoboSyncRow
                label="Main"
                state={mainState}
                onSync={handleSyncMain}
                hasUrl={hasKoboMain}
              />
              <KoboSyncRow
                label="Revisit"
                state={revisitState}
                onSync={handleSyncRevisit}
                hasUrl={hasKoboRevisit}
              />
            </div>
          )}

          {/* ── Manual upload (Upload mode) ──────────────────────── */}
          {syncMode === 'upload' && (
            <div className="pt-1 space-y-2">
              <label className="flex items-center gap-1.5 cursor-pointer w-full py-1.5 px-2 bg-primary-600 hover:bg-primary-700 text-white text-[11px] rounded">
                <Upload className="w-3 h-3" />
                {mainData ? 'Replace Main' : 'Upload Main'}
                <input type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'main')} />
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer w-full py-1.5 px-2 bg-[#555] hover:bg-[#666] text-white text-[11px] rounded">
                <Upload className="w-3 h-3" />
                {revisitData ? 'Replace Revisit' : 'Upload Revisit'}
                <input type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'revisit')} />
              </label>
            </div>
          )}
        </div>

        </>)}
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#f0f0f0]">

        {/* Title bar */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-[#bfdbfe]"
          style={{ background: 'linear-gradient(to right,#b8d4f0,#d0e8f8)' }}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-blue-100">
                <span className="text-[9px] font-black text-red-700">AMF</span>
              </div>
              <div className="w-9 h-9 bg-[#005baa] rounded-full flex items-center justify-center shadow-sm">
                <span className="text-[9px] font-black text-white">eHA</span>
              </div>
            </div>
            <h2 className="text-base font-extrabold text-[#1e3a8a] tracking-wide">
              AMF-PDM: {mode === 'main' ? 'MAIN DATA' : 'REVISIT DATA'} — {selectedState.toUpperCase()}
            </h2>
          </div>
          <span className="text-xs text-[#1e3a8a] font-semibold bg-white/60 px-3 py-1 rounded-full">
            {fmt(rawData?.length ?? 0)} records
          </span>
        </div>

        <div className="p-4 space-y-4">

          {/* ── KPI Row 1 – 6 boxes ───────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiBox label="Total Household Data Collected"       value={fmt(totalHH)} />
            <KpiBox label="Total Clean Household Data Collected" value={fmt(cleanHH)} />
            <KpiBox label="Total Settlements Reached"            value={fmt(uniqueSettlements)} />
            <KpiBox label="Total Complete Settlements"
              value={settlementsComplete !== null ? fmt(settlementsComplete) : fmt(lgaData.filter(l => l.collected > 0).length)} />
            <KpiBox label="Total Spares Used"                    value={fmt(totalSpares)} />
            <KpiBox label="Total Enumerators"                    value={uniqueEnumerators > 0 ? fmt(uniqueEnumerators) : '—'} />
          </div>

          {/* ── KPI Row 2 – 4 boxes ───────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiBox label="Total Households for Main Visit"      value={mainData ? fmt(mainData.length) : '—'} />
            <KpiBox label="Total Households Marked for Revisit"
              value={revisitMarked > 0 ? fmt(revisitMarked) : (revisitData ? fmt(revisitData.length) : '—')} />
            <KpiBox label="Total Settlements Incomplete"         value={fmt(settlementsIncomplete)} />
            <KpiBox label="Total Settlements Unreached"          value={fmt(settlementsUnreached)} />
          </div>

          {/* ── Charts: Daily bar + Gauge ─────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="rounded-xl shadow-sm p-4 bg-white border border-gray-200 xl:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-700">Household Submissions by Day</p>
                <button
                  onClick={() => downloadCSV(dailyData as unknown as Record<string, unknown>[], 'daily_submissions.csv')}
                  disabled={!dailyData.length}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-30"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData} margin={{ top: 16, right: 8, left: -10, bottom: 36 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="count" radius={[3,3,0,0]}
                      label={{ position: 'top', fontSize: 8, fill: '#374151' }}>
                      {dailyData.map((_, i) => (
                        <Cell key={i} fill={i === dailyData.length - 1 ? '#1e3a8a' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 opacity-40" />
                  <p className="text-sm">No date column detected in data</p>
                </div>
              )}
            </div>

            <div className="rounded-xl shadow-sm p-4 flex flex-col bg-white border border-gray-200">
              <p className="text-sm font-bold text-gray-700 mb-2">Clean Data vs Total</p>
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <Gauge value={cleanHH} max={totalHH} label="Clean Records" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#1e3a8a]">{lgaData.length}</p>
                  <p className="text-xs text-slate-500">LGAs covered</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── LGA bar chart ─────────────────────────────────────── */}
          {lgaData.length > 0 && (
            <div className="rounded-xl shadow-sm p-4 bg-white border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-700">Households Collected per LGA</p>
                <button
                  onClick={() => downloadCSV(lgaData as unknown as Record<string, unknown>[], 'households_per_lga.csv')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={lgaData} margin={{ top: 16, right: 8, left: -10, bottom: 54 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="lga" tick={{ fontSize: 9, fill: '#6b7280' }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="collected" radius={[3,3,0,0]}
                    label={{ position: 'top', fontSize: 9, fill: '#374151' }}>
                    {lgaData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── RA Target Table ───────────────────────────────────── */}
          {raRows.length > 0 ? (
            <div className="rounded-xl shadow-sm overflow-hidden bg-white border border-gray-200">
              <div className="px-4 py-2.5 bg-white border-b border-gray-200 flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-gray-700 mr-auto">Target HH vs Actual HH Collected per LGA</p>
                <div className="flex items-center gap-1">
                  {([
                    { id: 'all',   label: `All (${raRows.length})`,       active: 'bg-[#1e3a8a] text-white' },
                    { id: 'meet',  label: `Complete (${raMeetCount})`,     active: 'bg-emerald-600 text-white' },
                    { id: 'below', label: `Incomplete (${raBelowCount})`,  active: 'bg-red-500 text-white' },
                  ] as const).map(f => (
                    <button key={f.id} onClick={() => setRaFilter(f.id)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                        raFilter === f.id ? f.active : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => downloadCSV(
                    raRows.map(r => ({
                      LGA: r.lga,
                      'Research Assistant': r.ra,
                      Done: r.done,
                      Target: r.target ?? '—',
                      Status: r.target !== null
                        ? (r.done >= r.target ? 'Meet Target' : 'Below Target')
                        : 'No Target',
                    })),
                    'ra_targets.csv'
                  )}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 400 }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                      <th className="text-left px-4 py-3 font-bold uppercase text-xs tracking-wide w-36" style={{ color: '#94a3b8' }}>LGA</th>
                      <th className="text-left px-4 py-3 font-bold uppercase text-xs tracking-wide" style={{ color: '#94a3b8' }}>Research Assistant</th>
                      <th className="text-right px-4 py-3 font-bold uppercase text-xs tracking-wide w-36" style={{ color: '#94a3b8' }}>Done / Target</th>
                      <th className="text-center px-4 py-3 font-bold uppercase text-xs tracking-wide w-32" style={{ color: '#94a3b8' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRaRows.map((row, i) => {
                      const prevLga = i > 0 ? displayRaRows[i - 1].lga : null;
                      const showLga = row.lga !== prevLga;
                      const meetsTarget = row.target !== null ? row.done >= row.target : null;
                      return (
                        <tr key={i} className="border-b border-gray-100 hover:bg-blue-50">
                          <td className="px-4 py-2.5">
                            {showLga && (
                              <span className="font-bold text-[#1e3a8a] text-sm">{row.lga}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-800">{row.ra}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                            {row.target !== null
                              ? <span className={meetsTarget ? 'text-green-700' : 'text-red-600'}>
                                  {fmt(row.done)} / {fmt(row.target)}
                                </span>
                              : <span className="text-[#1e3a8a]">{fmt(row.done)}</span>
                            }
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {meetsTarget === null ? (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {fmt(row.done)} done
                              </span>
                            ) : meetsTarget ? (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-300">
                                Meet target
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                Below target
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : lgaData.length > 0 && (
            <div className="rounded-xl shadow-sm overflow-hidden bg-white border border-gray-200">
              <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between bg-white">
                <p className="text-sm font-bold text-gray-700">Households Collected per LGA</p>
                <button
                  onClick={() => downloadCSV(lgaData as unknown as Record<string, unknown>[], 'lga_coverage.csv')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
                <table className="w-full text-sm">
                  <thead className="bg-[#e8f0e8] sticky top-0 z-10">
                    <tr className="border-b border-gray-300">
                      <th className="text-left px-4 py-3 font-bold text-gray-700 uppercase text-xs tracking-wide">LGA</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-700 uppercase text-xs tracking-wide">HHs Collected</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-700 uppercase text-xs tracking-wide">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lgaData.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-blue-50">
                        <td className="px-4 py-2.5 font-semibold text-[#1e3a8a]">{row.lga}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{fmt(row.collected)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-[#1e3a8a]">
                          {totalHH > 0 ? ((row.collected / totalHH) * 100).toFixed(2) + '%' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
