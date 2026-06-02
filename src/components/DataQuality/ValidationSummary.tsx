import React from 'react';
import { ValidationSummary } from '../../types';
import {
  CheckCircle2, AlertTriangle, Users, Clock, MapPin, Crosshair,
  Layers, Radar, Copy, Timer
} from 'lucide-react';

interface Props {
  summary: ValidationSummary;
}

function ErrorRow({
  icon,
  label,
  count,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-600 truncate">{label}</span>
          <span className="text-xs font-bold ml-2 shrink-0" style={{ color }}>
            {count.toLocaleString()} ({pct.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

export default function ValidationSummaryPanel({ summary }: Props) {
  const { totalRecords, validRecords, flaggedRecords, qualityScore } = summary;
  const scoreColor = qualityScore >= 96 ? '#16a34a' : qualityScore >= 71 ? '#d97706' : '#dc2626';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      {/* Overall status cards */}
      <div className="lg:col-span-1 space-y-3">
        <div className="stat-card border-l-4" style={{ borderLeftColor: scoreColor }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Data Quality Score</p>
              <p className="text-4xl font-black" style={{ color: scoreColor }}>{qualityScore.toFixed(1)}%</p>
              <p className="text-xs text-slate-400 mt-1">{totalRecords.toLocaleString()} total records</p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${scoreColor}18` }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: scoreColor }} />
            </div>
          </div>
          {/* Score gauge */}
          <div className="mt-3 w-full bg-slate-100 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{ width: `${qualityScore}%`, backgroundColor: scoreColor }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card border-l-4 border-l-emerald-500">
            <p className="text-xs text-slate-500 mb-0.5">Valid</p>
            <p className="text-2xl font-bold text-emerald-600">{validRecords.toLocaleString()}</p>
            <p className="text-xs text-slate-400">{totalRecords > 0 ? ((validRecords / totalRecords) * 100).toFixed(1) : 0}%</p>
          </div>
          <div className="stat-card border-l-4 border-l-red-400">
            <p className="text-xs text-slate-500 mb-0.5">Flagged</p>
            <p className="text-2xl font-bold text-red-500">{flaggedRecords.toLocaleString()}</p>
            <p className="text-xs text-slate-400">{totalRecords > 0 ? ((flaggedRecords / totalRecords) * 100).toFixed(1) : 0}%</p>
          </div>
        </div>
      </div>

      {/* Error breakdown */}
      <div className="lg:col-span-2 card">
        <div className="card-header flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-white" />
          <span className="card-title">Validation Flags Breakdown</span>
        </div>
        <div className="p-4">
          <ErrorRow icon={<Users className="w-4 h-4" />} label="Basic Error (HH/Consent)" count={summary.basicErrors} total={totalRecords} color="#dc2626" />
          <ErrorRow icon={<Clock className="w-4 h-4" />} label="Duration Error (<10 or >30 min)" count={summary.timeErrors} total={totalRecords} color="#d97706" />
          <ErrorRow icon={<MapPin className="w-4 h-4" />} label="Missing GPS Coordinates" count={summary.gpsErrors} total={totalRecords} color="#2563eb" />
          <ErrorRow icon={<Crosshair className="w-4 h-4" />} label="GPS Precision Error (>10m)" count={summary.precisionErrors} total={totalRecords} color="#9333ea" />
          <ErrorRow icon={<Layers className="w-4 h-4" />} label="Stackpoint (Same GPS)" count={summary.stackpointErrors} total={totalRecords} color="#e11d48" />
          <ErrorRow icon={<Radar className="w-4 h-4" />} label="Proximity Error (<30m)" count={summary.proximityErrors} total={totalRecords} color="#0891b2" />
          <ErrorRow icon={<Copy className="w-4 h-4" />} label="Duplicate Household ID" count={summary.duplicateErrors} total={totalRecords} color="#ca8a04" />
          <ErrorRow icon={<Timer className="w-4 h-4" />} label="Interview Gap (<15 min)" count={summary.hhGapErrors} total={totalRecords} color="#4338ca" />
        </div>
      </div>
    </div>
  );
}
