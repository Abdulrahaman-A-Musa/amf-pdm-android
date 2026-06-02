import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, CheckSquare, Map, Users, Table, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { readExcelFile, getUniqueValues } from '../../utils/excelUtils';
import { validateData, getValidationSummary, getMapData } from '../../utils/dataValidation';
import { buildEnumeratorStats } from '../../utils/enumeratorUtils';
import { getPerformanceBadge, formatMinutes } from '../../utils/enumeratorUtils';
import { DataRow, ValidationRow } from '../../types';
import ValidationSummaryPanel from './ValidationSummary';
import QualityDataTable from './QualityDataTable';
import ValidationMap from './ValidationMap';
import EnumeratorReports from './EnumeratorReports';

type SubTab = 'summary' | 'table' | 'map' | 'reports';

const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'summary', label: 'Summary', icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'table', label: 'Data Table', icon: <Table className="w-4 h-4" /> },
  { id: 'map', label: 'GPS Map', icon: <Map className="w-4 h-4" /> },
  { id: 'reports', label: 'Enumerator Reports', icon: <Users className="w-4 h-4" /> },
];

export default function DataQuality() {
  const { qualityData, validationData, setQualityData, setValidationData, isProcessing, setProcessing } = useAppStore();
  const [subTab, setSubTab] = useState<SubTab>('summary');
  const [fileName, setFileName] = useState('');
  const [lgaFilter, setLgaFilter] = useState('All');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [error, setError] = useState('');

  const handleFile = useCallback(async (file: File) => {
    setProcessing(true);
    setError('');
    try {
      const raw: DataRow[] = await readExcelFile(file);
      setQualityData(raw);
      setFileName(file.name);
      // Run validation in a microtask to not block the UI
      setTimeout(() => {
        try {
          const validated = validateData(raw);
          setValidationData(validated);
        } catch (e) {
          setError(`Validation error: ${String(e)}`);
        } finally {
          setProcessing(false);
        }
      }, 50);
    } catch (e) {
      setError(`Failed to read file: ${String(e)}`);
      setProcessing(false);
    }
  }, [setQualityData, setValidationData, setProcessing]);

  const lgaChoices = useMemo(() => {
    if (!validationData) return ['All'];
    return ['All', ...getUniqueValues(validationData as DataRow[], 'calc_l4_name')];
  }, [validationData]);

  // Apply LGA + date filters
  const filteredData = useMemo((): ValidationRow[] => {
    if (!validationData) return [];
    let data = validationData;
    if (lgaFilter !== 'All') {
      data = data.filter((r) => String(r['calc_l4_name'] ?? '') === lgaFilter);
    }
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59);
      data = data.filter((r) => {
        const d = new Date(String(r['End of Survey'] ?? ''));
        return !isNaN(d.getTime()) && d >= start && d <= end;
      });
    }
    return data;
  }, [validationData, lgaFilter, dateRange]);

  const summary = useMemo(() => getValidationSummary(filteredData), [filteredData]);
  const mapPoints = useMemo(() => getMapData(filteredData), [filteredData]);
  const enumStats = useMemo(() => buildEnumeratorStats(filteredData), [filteredData]);
  const availableColumns = useMemo(
    () => (filteredData.length > 0 ? Object.keys(filteredData[0]) : []),
    [filteredData]
  );

  const handleDownloadHTML = useCallback(() => {
    const badge = (score: number) => getPerformanceBadge(score);
    const cards = enumStats.map((e) => {
      const b = badge(e.qualityScore);
      const errors = [
        ['Basic', e.basicErrors], ['Duration', e.timeErrors], ['GPS', e.gpsErrors],
        ['Precision', e.precisionErrors], ['Stackpoint', e.stackpointErrors],
        ['Proximity', e.proximityErrors], ['Duplicate', e.duplicateErrors], ['Gap', e.hhGapErrors],
      ].filter(([, c]) => (c as number) > 0);

      return `
        <div style="background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);margin:16px 0;overflow:hidden;page-break-after:always;">
          <div style="height:4px;background:linear-gradient(90deg,#0090fc,#005ec2);"></div>
          <div style="padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
              <div>
                <h2 style="margin:0;color:#1e293b;font-size:18px;">${e.name}</h2>
                <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${e.primaryLga} · ${e.dateRange}</p>
              </div>
              <span style="background:${b.bg};color:${b.color};padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;">${b.label}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
              <div style="text-align:center;padding:12px;background:#eff6ff;border-radius:10px;"><b style="font-size:22px;color:#0090fc;">${e.totalSurveys}</b><p style="margin:4px 0 0;font-size:11px;color:#64748b;">Total</p></div>
              <div style="text-align:center;padding:12px;background:#f0fdf4;border-radius:10px;"><b style="font-size:22px;color:#16a34a;">${e.validSurveys}</b><p style="margin:4px 0 0;font-size:11px;color:#64748b;">Valid</p></div>
              <div style="text-align:center;padding:12px;background:#fef2f2;border-radius:10px;"><b style="font-size:22px;color:#dc2626;">${e.flaggedSurveys}</b><p style="margin:4px 0 0;font-size:11px;color:#64748b;">Flagged</p></div>
              <div style="text-align:center;padding:12px;background:#fffbeb;border-radius:10px;"><b style="font-size:22px;color:${b.color};">${e.qualityScore.toFixed(1)}%</b><p style="margin:4px 0 0;font-size:11px;color:#64748b;">Score</p></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
              <div style="padding:10px;background:#fdf4ff;border-radius:10px;font-size:12px;"><b>Avg Interview:</b> ${formatMinutes(e.avgInterviewDuration)}</div>
              <div style="padding:10px;background:#fdf4ff;border-radius:10px;font-size:12px;"><b>Total Time:</b> ${formatMinutes(e.totalTimeSpent)}</div>
            </div>
            ${errors.length > 0 ? `
            <div style="background:#fafafa;border-radius:10px;padding:14px;">
              <b style="font-size:13px;color:#dc2626;">Error Breakdown</b>
              <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                ${errors.map(([label, count]) => `
                  <div style="padding:8px;background:#fff;border:1px solid #fecaca;border-radius:8px;font-size:12px;">
                    <b style="color:#dc2626;">${label}:</b> ${count}
                  </div>`).join('')}
              </div>
            </div>` : '<p style="color:#16a34a;font-size:13px;">✓ No errors detected</p>'}
          </div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>AMF-PDM Enumerator Reports</title>
      <style>body{font-family:Inter,sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#f1f5f9;}</style>
      </head><body>
      <div style="text-align:center;padding:30px;background:linear-gradient(135deg,#0090fc,#005ec2);color:white;border-radius:16px;margin-bottom:20px;">
        <h1 style="margin:0;font-size:28px;">EHA-(AMF-PDM)</h1>
        <p style="margin:8px 0 0;opacity:0.8;">Enumerator Performance Report Cards · ${new Date().toLocaleDateString()}</p>
      </div>
      ${cards}
      </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'enumerator_reports.html'; a.click();
    URL.revokeObjectURL(url);
  }, [enumStats]);

  return (
    <div className="space-y-4">
      {/* Upload + Filters */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Upload className="w-5 h-5 text-white" />
          <span className="card-title">Upload & Filter</span>
        </div>
        <div className="p-4 flex flex-wrap gap-4 items-end">
          {/* File upload */}
          <div className="flex-1 min-w-56">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Excel File</label>
            <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 hover:border-primary-400 rounded-xl px-4 py-3 transition-all group">
              <Upload className="w-4 h-4 text-slate-400 group-hover:text-primary-500 shrink-0" />
              <span className="text-sm text-slate-500 truncate">{fileName || 'Click to upload .xlsx / .xls'}</span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </div>

          {/* LGA filter */}
          <div className="min-w-40 flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">LGA Filter</label>
            <select className="select-field" value={lgaFilter} onChange={(e) => setLgaFilter(e.target.value)}>
              {lgaChoices.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Date range */}
          <div className="min-w-40 flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Date From</label>
            <input type="date" className="input-field" value={dateRange.start} onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))} />
          </div>
          <div className="min-w-40 flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Date To</label>
            <input type="date" className="input-field" value={dateRange.end} onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))} />
          </div>
          {(dateRange.start || dateRange.end) && (
            <button className="btn-secondary text-xs py-2.5" onClick={() => setDateRange({ start: '', end: '' })}>Reset Dates</button>
          )}
        </div>

        {/* Status bar */}
        {validationData && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 text-sm bg-primary-50 text-primary-700 px-4 py-2.5 rounded-xl border border-primary-100">
              <CheckSquare className="w-4 h-4" />
              <span><strong>{filteredData.length.toLocaleString()}</strong> records loaded · <strong>{summary.flaggedRecords.toLocaleString()}</strong> flagged · Quality Score: <strong>{summary.qualityScore.toFixed(1)}%</strong></span>
            </div>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center py-16 gap-3 text-primary-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Running validation checks...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!validationData && !isProcessing && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">Upload an Excel file to begin quality analysis</p>
          <p className="text-sm mt-1">Supports survey data with ODK field names</p>
        </div>
      )}

      {validationData && !isProcessing && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {subTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`tab-btn flex items-center gap-2 ${subTab === t.id ? 'tab-btn-active' : 'tab-btn-inactive'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {subTab === 'summary' && <ValidationSummaryPanel summary={summary} />}

          {subTab === 'table' && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors ${showFlaggedOnly ? 'bg-red-500' : 'bg-slate-300'}`}
                    onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showFlaggedOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">Show flagged records only</span>
                </label>
              </div>
              <QualityDataTable data={filteredData} showFlaggedOnly={showFlaggedOnly} />
            </div>
          )}

          {subTab === 'map' && <ValidationMap points={mapPoints} />}

          {subTab === 'reports' && (
            <EnumeratorReports stats={enumStats} onDownload={handleDownloadHTML} availableColumns={availableColumns} />
          )}
        </>
      )}
    </div>
  );
}
