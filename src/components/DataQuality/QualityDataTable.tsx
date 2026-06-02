import React, { useState, useMemo } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { ValidationRow } from '../../types';

const CHECK_COLS = [
  'Duplicate_Status', 'Overall_Status', 'Basic_Check', 'Time_Check',
  'GPS_Check', 'Precision_Check', 'Stackpoint_Check', 'Proximity_Check',
  'Duplicate_Check', 'HH_Interview_Gap_Flag',
];

const KEY_COLS = [
  'calc_household_id', 'Enumerator User Name', 'calc_l4_name',
  'calc_ward_name', 'calc_village_name', 'End of Survey', 'interview_duration',
];

interface Props {
  data: ValidationRow[];
  showFlaggedOnly: boolean;
}

function cellBg(val: unknown): string {
  const s = String(val ?? '');
  if (s === 'PASS' || s === 'VALID') return 'bg-emerald-50 text-emerald-700';
  if (s === 'FLAGGED' || s.startsWith('❌')) return 'bg-red-50 text-red-700';
  return '';
}

export default function QualityDataTable({ data, showFlaggedOnly }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const filtered = useMemo(() => {
    let rows = showFlaggedOnly ? data.filter((r) => r.Overall_Status === 'FLAGGED') : data;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        KEY_COLS.some((col) => String(r[col] ?? '').toLowerCase().includes(q))
      );
    }
    return rows;
  }, [data, showFlaggedOnly, search]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Build display columns: key cols + check cols (only those present in data)
  const allCols = useMemo(() => {
    if (!data.length) return [];
    const keys = Object.keys(data[0]);
    const priority = [...KEY_COLS, ...CHECK_COLS].filter((c) => keys.includes(c));
    const rest = keys.filter((c) => !priority.includes(c)).slice(0, 20);
    return [...priority, ...rest];
  }, [data]);

  const handleExport = () => {
    const csv = [
      allCols.join(','),
      ...filtered.slice(0, 10000).map((row) =>
        allCols.map((c) => `"${String(row[c] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'quality_data.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-white" />
          <span className="card-title">Data Records</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm">{filtered.length.toLocaleString()} rows</span>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input-field pl-9 text-sm"
            placeholder="Search by household ID, enumerator, village..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              {allCols.slice(0, 18).map((col) => (
                <th key={col} className="whitespace-nowrap text-xs">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => (
              <tr key={i} className={row.Overall_Status === 'FLAGGED' ? 'row-flagged' : ''}>
                {allCols.slice(0, 18).map((col) => {
                  const val = row[col];
                  const cls = CHECK_COLS.includes(col) ? cellBg(val) : '';
                  return (
                    <td key={col} className={`text-xs whitespace-nowrap ${cls}`}>
                      {col === 'interview_duration' && typeof val === 'number'
                        ? `${val.toFixed(1)}m`
                        : String(val ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-slate-400 text-sm">
          {showFlaggedOnly ? 'No flagged records found' : 'No records match your search'}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Page {page + 1} of {Math.max(1, totalPages)} · {filtered.length.toLocaleString()} total rows
        </p>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs py-1 px-3" onClick={() => setPage(0)} disabled={page === 0}>«</button>
          <button className="btn-secondary text-xs py-1 px-3" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>‹ Prev</button>
          <button className="btn-secondary text-xs py-1 px-3" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next ›</button>
          <button className="btn-secondary text-xs py-1 px-3" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
        </div>
      </div>
    </div>
  );
}
