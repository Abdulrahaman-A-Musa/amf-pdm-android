import React, { useState, useMemo, useCallback } from 'react';
import { Upload, TrendingUp, AlertCircle, CheckCircle2, Filter, Download } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { readExcelFile } from '../../utils/excelUtils';
import { runSimilarityCheck, TARGET_VARIABLES } from '../../utils/similarity';
import { getUniqueValues } from '../../utils/excelUtils';
import { ComparisonResult, SimilarityStats } from '../../types';

function FileUploadCard({
  label,
  onFile,
  fileName,
  loaded,
}: {
  label: string;
  onFile: (f: File) => void;
  fileName: string;
  loaded: boolean;
}) {
  return (
    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-6 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all duration-200 group">
      <input
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {loaded ? (
        <>
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-emerald-600 text-center">{fileName}</p>
          <p className="text-xs text-slate-400 mt-1">Click to replace</p>
        </>
      ) : (
        <>
          <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary-500 mb-2 transition-colors" />
          <p className="text-sm font-semibold text-slate-600 text-center">{label}</p>
          <p className="text-xs text-slate-400 mt-1">.xlsx or .xls</p>
        </>
      )}
    </label>
  );
}

function SummaryCard({ stat }: { stat: SimilarityStats }) {
  const pct = stat.similarityRate;
  const color = pct >= 90 ? '#16a34a' : pct >= 70 ? '#d97706' : '#dc2626';
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
      <p className="text-xs font-semibold text-slate-500 mb-3 truncate" title={stat.variable}>{stat.variable}</p>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
        <span className="text-xs text-slate-400">{stat.matchingRecords}/{stat.totalRecords}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">Similarity Rate</p>
    </div>
  );
}

export default function DataComparison() {
  const { mainData, revisitData, setMainData, setRevisitData } = useAppStore();
  const [loading, setLoading] = useState({ main: false, revisit: false });
  const [fileNames, setFileNames] = useState({ main: '', revisit: '' });
  const [lgaFilter, setLgaFilter] = useState('All');
  const [varFilter, setVarFilter] = useState('All');
  const [matchFilter, setMatchFilter] = useState<'all' | 'match' | 'mismatch'>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const handleFile = useCallback(
    async (file: File, type: 'main' | 'revisit') => {
      setLoading((p) => ({ ...p, [type]: true }));
      try {
        const data = await readExcelFile(file);
        if (type === 'main') { setMainData(data); setFileNames((p) => ({ ...p, main: file.name })); }
        else { setRevisitData(data); setFileNames((p) => ({ ...p, revisit: file.name })); }
      } catch { alert('Failed to read file. Please ensure it is a valid Excel file.'); }
      setLoading((p) => ({ ...p, [type]: false }));
    },
    [setMainData, setRevisitData]
  );

  const lgaChoices = useMemo(() => {
    if (!mainData) return ['All'];
    return ['All', ...getUniqueValues(mainData, 'calc_l4_name')];
  }, [mainData]);

  const { comparisons, stats } = useMemo(() => {
    if (!mainData || !revisitData) return { comparisons: [], stats: [] };
    return runSimilarityCheck(mainData, revisitData, lgaFilter);
  }, [mainData, revisitData, lgaFilter]);

  const filtered = useMemo(() => {
    let rows: ComparisonResult[] = comparisons;
    if (varFilter !== 'All') rows = rows.filter((r) => r.variable === varFilter);
    if (matchFilter === 'match') rows = rows.filter((r) => r.match);
    if (matchFilter === 'mismatch') rows = rows.filter((r) => !r.match);
    return rows;
  }, [comparisons, varFilter, matchFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleExportCSV = useCallback(() => {
    if (!filtered.length) return;
    const cols = ['Variable', 'Village', 'Household ID', 'Main Value', 'Revisit Value', 'Match', 'Score'];
    const rows = filtered.map((r) => [
      r.variable,
      r.village,
      r.householdId,
      String(r.mainValue ?? ''),
      String(r.revisitValue ?? ''),
      r.match ? 'Yes' : 'No',
      r.score > 0 ? '+1' : '-1',
    ]);
    const csv = [cols, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const overallStats = useMemo(() => {
    if (!stats.length) return null;
    const totalMatch = stats.reduce((s, r) => s + r.matchingRecords, 0);
    const totalRec = stats.reduce((s, r) => s + r.totalRecords, 0);
    return { matchingRecords: totalMatch, totalRecords: totalRec, rate: totalRec > 0 ? (totalMatch / totalRec) * 100 : 0 };
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Upload className="w-5 h-5 text-white" />
          <span className="card-title">Upload Survey Files</span>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileUploadCard
            label="Upload Main Data"
            onFile={(f) => handleFile(f, 'main')}
            fileName={fileNames.main}
            loaded={!!mainData}
          />
          {loading.main && <p className="text-xs text-primary-500">Processing...</p>}
          <FileUploadCard
            label="Upload Revisit Data"
            onFile={(f) => handleFile(f, 'revisit')}
            fileName={fileNames.revisit}
            loaded={!!revisitData}
          />
          {loading.revisit && <p className="text-xs text-primary-500">Processing...</p>}
        </div>
      </div>

      {/* Filter */}
      {mainData && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Filter className="w-5 h-5 text-white" />
            <span className="card-title">Filters</span>
          </div>
          <div className="p-4 flex flex-wrap gap-4">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Filter LGA</label>
              <select className="select-field" value={lgaFilter} onChange={(e) => { setLgaFilter(e.target.value); setPage(0); }}>
                {lgaChoices.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Variable</label>
              <select className="select-field" value={varFilter} onChange={(e) => { setVarFilter(e.target.value); setPage(0); }}>
                <option value="All">All Variables</option>
                {TARGET_VARIABLES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Match Status</label>
              <select className="select-field" value={matchFilter} onChange={(e) => { setMatchFilter(e.target.value as 'all' | 'match' | 'mismatch'); setPage(0); }}>
                <option value="all">All Records</option>
                <option value="match">Matches Only</option>
                <option value="mismatch">Mismatches Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Overall & per-variable stats */}
      {overallStats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card border-l-4 border-l-primary-500">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Overall Similarity</p>
              <p className="text-3xl font-bold text-primary-600">{overallStats.rate.toFixed(1)}%</p>
              <p className="text-xs text-slate-400 mt-1">{overallStats.matchingRecords.toLocaleString()} of {overallStats.totalRecords.toLocaleString()} records</p>
            </div>
            <div className="stat-card border-l-4 border-l-emerald-500">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Matching Records</p>
              <p className="text-3xl font-bold text-emerald-600">{overallStats.matchingRecords.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">Exact matches across all variables</p>
            </div>
            <div className="stat-card border-l-4 border-l-red-400">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mismatches</p>
              <p className="text-3xl font-bold text-red-500">{(overallStats.totalRecords - overallStats.matchingRecords).toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">Require field follow-up</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats.map((s) => <SummaryCard key={s.variable} stat={s} />)}
          </div>
        </>
      )}

      {/* Comparison table */}
      {filtered.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-white" />
              <span className="card-title">Detailed Comparison</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/80 text-sm">{filtered.length.toLocaleString()} records</span>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors border border-white/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </button>
            </div>
          </div>
          <div className="p-0">
            <div className="table-container rounded-none rounded-b-2xl">
              <table>
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Village</th>
                    <th>Household ID</th>
                    <th>Main Value</th>
                    <th>Revisit Value</th>
                    <th>Match</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row, i) => (
                    <tr key={i} className={row.match ? 'row-valid' : 'row-flagged'}>
                      <td className="text-xs max-w-48 truncate" title={row.variable}>{row.variable}</td>
                      <td className="text-xs">{row.village}</td>
                      <td className="text-xs font-mono">{row.householdId}</td>
                      <td className="text-xs">{String(row.mainValue ?? '')}</td>
                      <td className="text-xs">{String(row.revisitValue ?? '')}</td>
                      <td>
                        <span className={row.match ? 'badge-valid' : 'badge-flagged'}>
                          {row.match ? '✓ Yes' : '✗ No'}
                        </span>
                      </td>
                      <td className={`text-xs font-bold ${row.match ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.score > 0 ? '+1' : '-1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs py-1 px-3" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
                <button className="btn-secondary text-xs py-1 px-3" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!mainData && !revisitData && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">Upload both files to begin comparison</p>
          <p className="text-sm mt-1">Supports .xlsx and .xls formats</p>
        </div>
      )}
    </div>
  );
}
