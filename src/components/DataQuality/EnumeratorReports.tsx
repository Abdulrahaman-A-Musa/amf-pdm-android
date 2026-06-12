import React, { useState, useMemo } from 'react';
import {
  Users, Download, Clock, ChevronDown, ChevronUp, MapPin, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { EnumeratorStats } from '../../types';
import { getPerformanceBadge, formatMinutes } from '../../utils/enumeratorUtils';

interface Props {
  stats: EnumeratorStats[];
  onDownload: () => void;
  availableColumns?: string[];
}

const ERROR_DEFS = [
  { key: 'basicErrors',      label: 'Basic Check',       icon: '👥', desc: 'HH not found / no adult / no consent',    color: '#dc2626' },
  { key: 'timeErrors',       label: 'Duration',          icon: '⏱️', desc: '<10 min or >30 min surveys',              color: '#d97706' },
  { key: 'gpsErrors',        label: 'GPS Missing',       icon: '📍', desc: 'Null or zero coordinates',                color: '#2563eb' },
  { key: 'precisionErrors',  label: 'GPS Precision',     icon: '🎯', desc: 'Accuracy >10 m',                          color: '#9333ea' },
  { key: 'stackpointErrors', label: 'Stackpoint',        icon: '🔴', desc: 'Multiple HHs at same GPS',                color: '#e11d48' },
  { key: 'proximityErrors',  label: 'Proximity',         icon: '📐', desc: 'HHs within 20–30 m of each other',       color: '#0891b2' },
  { key: 'duplicateErrors',  label: 'Duplicate Data',    icon: '📋', desc: 'Same household ID repeated',              color: '#ca8a04' },
  { key: 'hhGapErrors',      label: 'Interview Gap',     icon: '⏰', desc: '<15 min between consecutive surveys',     color: '#4338ca' },
];

function ReportCard({ stat, defaultOpen = false }: { stat: EnumeratorStats; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [showFlagged, setShowFlagged] = useState(false);
  const badge = getPerformanceBadge(stat.qualityScore);

  const totalErrors = ERROR_DEFS.reduce(
    (sum, { key }) => sum + ((stat as Record<string, unknown>)[key] as number ?? 0), 0
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
        style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #0077e6 100%)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white font-black text-sm shrink-0">
            {stat.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm truncate">{stat.name}</h3>
            <p className="text-blue-200 text-xs truncate">{stat.primaryLga} · {stat.dateRange}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"
            style={{ color: badge.color, backgroundColor: badge.bg }}>
            {badge.label}
          </span>
          <button
            onClick={() => setOpen(!open)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white"
          >
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Stats table ────────────────────────────────────────────── */}
      <table className="w-full border-b border-slate-100" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-slate-50">
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-500 border-r border-slate-100">Total</th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-500 border-r border-slate-100">Valid</th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-500 border-r border-slate-100">Flagged</th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-500 border-r border-slate-100">Score</th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-500 border-r border-slate-100">Avg Time</th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-500">Total Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-2.5 text-center border-r border-slate-100">
              <span className="text-base font-black text-primary-600">{stat.totalSurveys.toLocaleString()}</span>
            </td>
            <td className="px-2 py-2.5 text-center border-r border-slate-100">
              <span className="text-base font-black text-green-600">{stat.validSurveys.toLocaleString()}</span>
            </td>
            <td className="px-2 py-2.5 text-center border-r border-slate-100">
              <span className="text-base font-black text-red-600">{stat.flaggedSurveys.toLocaleString()}</span>
            </td>
            <td className="px-2 py-2.5 text-center border-r border-slate-100">
              <span className="text-base font-black" style={{ color: badge.color }}>{stat.qualityScore.toFixed(1)}%</span>
            </td>
            <td className="px-2 py-2.5 text-center border-r border-slate-100">
              <span className="text-sm font-bold text-purple-600">{formatMinutes(stat.avgInterviewDuration)}</span>
            </td>
            <td className="px-2 py-2.5 text-center">
              <span className="text-sm font-bold text-pink-600">{formatMinutes(stat.totalTimeSpent)}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Expandable section ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors border-b border-slate-100"
      >
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          {totalErrors > 0
            ? <span className="text-red-500 font-semibold">{totalErrors} error{totalErrors !== 1 ? 's' : ''} across {ERROR_DEFS.filter(({ key }) => ((stat as Record<string, unknown>)[key] as number) > 0).length} check{ERROR_DEFS.filter(({ key }) => ((stat as Record<string, unknown>)[key] as number) > 0).length !== 1 ? 's' : ''}</span>
            : <span className="text-emerald-600 font-semibold">No errors detected</span>
          }
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="animate-fade-in">

          {/* Error breakdown table */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Quality Check Breakdown
            </p>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Check Type</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Description</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-500">Flags</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ERROR_DEFS.map(({ key, label, icon, desc, color }) => {
                    const count = (stat as Record<string, unknown>)[key] as number ?? 0;
                    return (
                      <tr key={key} className={count > 0 ? 'bg-red-50/40' : ''}>
                        <td className="px-3 py-2 font-medium text-slate-700">
                          <span className="mr-1">{icon}</span>{label}
                        </td>
                        <td className="px-3 py-2 text-slate-400">{desc}</td>
                        <td className="px-3 py-2 text-center font-bold" style={{ color: count > 0 ? color : '#16a34a' }}>
                          {count}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {count === 0
                            ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" />Pass</span>
                            : <span className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: color }}>Flag</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Coverage areas */}
          {stat.locationsWorked.length > 0 && (
            <div className="px-4 pt-2 pb-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" /> Coverage Areas
              </p>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">LGA</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-500">Wards</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-500">Villages</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Sample Villages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stat.locationsWorked.map((loc) => (
                      <tr key={loc.lga}>
                        <td className="px-3 py-2 font-semibold text-primary-700">{loc.lga}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{loc.wards.length}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{loc.villages.length}</td>
                        <td className="px-3 py-2 text-slate-400 truncate max-w-0" style={{ maxWidth: 200 }}>
                          {loc.villages.slice(0, 4).join(', ')}{loc.villages.length > 4 ? ` +${loc.villages.length - 4} more` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Flagged records */}
          {stat.flaggedSurveys > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {stat.flaggedSurveys} Flagged Records
                </p>
                <button
                  className="text-xs text-primary-600 hover:underline font-medium"
                  onClick={() => setShowFlagged(!showFlagged)}
                >
                  {showFlagged ? 'Hide' : 'Show'} details
                </button>
              </div>
              {showFlagged && (
                <div className="rounded-lg border border-red-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-red-50 border-b border-red-200">
                        <th className="px-3 py-2 text-left font-semibold text-red-700">Household ID</th>
                        <th className="px-3 py-2 text-left font-semibold text-red-700">Village</th>
                        <th className="px-3 py-2 text-left font-semibold text-red-700">Failed Checks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stat.flaggedRecords.slice(0, 20).map((rec, i) => {
                        const issues = [
                          'Basic_Check', 'Time_Check', 'GPS_Check', 'Precision_Check',
                          'Stackpoint_Check', 'Proximity_Check', 'Duplicate_Check', 'HH_Interview_Gap_Flag',
                        ].filter((c) => rec[c] !== 'PASS');
                        return (
                          <tr key={i} className="border-b border-red-100 last:border-0 hover:bg-red-50/50">
                            <td className="px-3 py-2 font-mono font-semibold text-slate-700">
                              {String(rec['calc_household_id'] ?? 'N/A')}
                            </td>
                            <td className="px-3 py-2 text-slate-500">{String(rec['calc_village_name'] ?? 'N/A')}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {issues.map((col) => (
                                  <span key={col} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                    {col.replace(/_Check|_Flag/g, '').replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {stat.flaggedSurveys > 20 && (
                    <p className="text-xs text-center text-slate-400 py-2 bg-red-50/50">
                      Showing first 20 of {stat.flaggedSurveys} flagged records
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Filter / page wrapper ──────────────────────────────────────────────── */

type PerformanceFilter = 'all' | 'very_good' | 'needs_improvement' | 'requires_training' | 'dismissal';

function getPerformanceTier(score: number): PerformanceFilter {
  if (score >= 80) return 'very_good';
  if (score >= 60) return 'needs_improvement';
  if (score >= 40) return 'requires_training';
  return 'dismissal';
}

const PERFORMANCE_OPTIONS: { value: PerformanceFilter; label: string }[] = [
  { value: 'all',               label: 'All Performance Levels' },
  { value: 'very_good',         label: '🌟 Very Good (≥80%)' },
  { value: 'needs_improvement', label: '⚠️ Needs Improvement (60–79%)' },
  { value: 'requires_training', label: '📚 Requires Training (40–59%)' },
  { value: 'dismissal',         label: '❌ Recommended for Dismissal (<40%)' },
];

export default function EnumeratorReports({ stats, onDownload, availableColumns }: Props) {
  const [search, setSearch]             = useState('');
  const [lgaFilter, setLgaFilter]       = useState('All');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'issues'>('all');
  const [perfFilter, setPerfFilter]     = useState<PerformanceFilter>('all');

  const lgas = useMemo(() => {
    const set = new Set(stats.map((s) => s.primaryLga));
    return ['All', ...Array.from(set).sort()];
  }, [stats]);

  const filtered = useMemo(() => {
    let result = stats;
    if (lgaFilter !== 'All')          result = result.filter((s) => s.primaryLga === lgaFilter);
    if (qualityFilter === 'issues')   result = result.filter((s) => s.flaggedSurveys > 0);
    if (perfFilter !== 'all')         result = result.filter((s) => getPerformanceTier(s.qualityScore) === perfFilter);
    if (search)                       result = result.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [stats, lgaFilter, qualityFilter, perfFilter, search]);

  const tierCounts = useMemo(() => ({
    very_good:         stats.filter((s) => getPerformanceTier(s.qualityScore) === 'very_good').length,
    needs_improvement: stats.filter((s) => getPerformanceTier(s.qualityScore) === 'needs_improvement').length,
    requires_training: stats.filter((s) => getPerformanceTier(s.qualityScore) === 'requires_training').length,
    dismissal:         stats.filter((s) => getPerformanceTier(s.qualityScore) === 'dismissal').length,
  }), [stats]);

  if (!stats.length) {
    const enumCols = availableColumns?.filter((c) => c.toLowerCase().includes('enumerator')) ?? [];
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Users className="w-12 h-12 mb-3 opacity-40" />
        <p className="font-medium">No enumerator data available</p>
        {availableColumns && availableColumns.length > 0 ? (
          <div className="mt-3 text-xs text-center max-w-md">
            {enumCols.length > 0
              ? <p className="text-amber-600">Found enumerator-related columns: <strong>{enumCols.join(', ')}</strong></p>
              : <p className="text-red-500">No column containing "enumerator" found in your data. Expected: <em>Enumerator User Name</em></p>
            }
          </div>
        ) : (
          <p className="text-sm mt-1">Upload quality data to generate report cards</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-white" />
            <span className="card-title">Enumerator Performance Report Cards</span>
          </div>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download HTML
          </button>
        </div>

        <div className="p-4 flex flex-wrap gap-3">
          <input
            className="input-field flex-1 min-w-48"
            placeholder="Search enumerator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select-field flex-1 min-w-40" value={lgaFilter} onChange={(e) => setLgaFilter(e.target.value)}>
            {lgas.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select className="select-field flex-1 min-w-44" value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value as 'all' | 'issues')}>
            <option value="all">All Enumerators</option>
            <option value="issues">With Quality Issues</option>
          </select>
          <select
            className="select-field flex-1 min-w-56"
            value={perfFilter}
            onChange={(e) => setPerfFilter(e.target.value as PerformanceFilter)}
          >
            {PERFORMANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Tier summary — clickable */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 border-t border-slate-100">
          {([
            { tier: 'very_good'         as PerformanceFilter, label: '🌟 Very Good (≥80%)',          count: tierCounts.very_good,         color: '#16a34a', bg: '#dcfce7' },
            { tier: 'needs_improvement' as PerformanceFilter, label: '⚠️ Needs Improve (60–79%)',    count: tierCounts.needs_improvement, color: '#d97706', bg: '#fef3c7' },
            { tier: 'requires_training' as PerformanceFilter, label: '📚 Req. Training (40–59%)',    count: tierCounts.requires_training, color: '#ea580c', bg: '#ffedd5' },
            { tier: 'dismissal'         as PerformanceFilter, label: '❌ For Dismissal (<40%)',       count: tierCounts.dismissal,         color: '#dc2626', bg: '#fee2e2' },
          ] as const).map(({ tier, label, count, color, bg }) => (
            <button
              key={tier}
              onClick={() => setPerfFilter(perfFilter === tier ? 'all' : tier)}
              className="p-3 text-center transition-all hover:opacity-80"
              style={{ backgroundColor: perfFilter === tier ? bg : undefined }}
            >
              <p className="text-2xl font-black" style={{ color }}>{count}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color }}>{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filtered.map((stat) => (
          <ReportCard key={stat.name} stat={stat} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          <p>No enumerators match your filters</p>
        </div>
      )}
    </div>
  );
}
