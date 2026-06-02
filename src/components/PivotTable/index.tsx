import React, { useState, useMemo } from 'react';
import { Table2, Download, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getCategoricalColumns, getNumericColumns } from '../../utils/excelUtils';
import { DataRow } from '../../types';

function aggregate(values: number[], func: string): number {
  if (!values.length) return 0;
  switch (func) {
    case 'count': return values.length;
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'mean': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    default: return values.length;
  }
}

export default function PivotTable() {
  const { qualityData } = useAppStore();
  const [indexCol, setIndexCol] = useState('');
  const [colCol, setColCol] = useState('');
  const [valueCol, setValueCol] = useState('');
  const [aggFunc, setAggFunc] = useState('count');

  const catCols = useMemo(() => qualityData ? getCategoricalColumns(qualityData) : [], [qualityData]);
  const numCols = useMemo(() => qualityData ? getNumericColumns(qualityData) : [], [qualityData]);

  const df = qualityData;

  // Built-in summary: total vs valid submissions per selected index
  const builtinTable = useMemo(() => {
    if (!df || !indexCol) return null;
    const grouped = new Map<string, { total: number; valid: Set<string> }>();
    df.forEach((row) => {
      const key = String(row[indexCol] ?? '(blank)');
      if (!grouped.has(key)) grouped.set(key, { total: 0, valid: new Set() });
      const entry = grouped.get(key)!;
      entry.total += 1;
      const hhId = String(row['calc_household_id'] ?? '');
      if (hhId) entry.valid.add(hhId);
    });
    const rows = Array.from(grouped.entries()).map(([key, v]) => ({
      [indexCol]: key,
      'Total Submissions': v.total,
      'Unique Households': v.valid.size,
    }));
    rows.sort((a, b) => String(a[indexCol]).localeCompare(String(b[indexCol])));
    const totalRow = {
      [indexCol]: 'TOTAL',
      'Total Submissions': rows.reduce((s, r) => s + (r['Total Submissions'] as number), 0),
      'Unique Households': rows.reduce((s, r) => s + (r['Unique Households'] as number), 0),
    };
    return { rows, totalRow };
  }, [df, indexCol]);

  // Custom pivot
  const pivotTable = useMemo(() => {
    if (!df || !indexCol || !colCol || !valueCol || indexCol === colCol) return null;
    const rowKeys = new Set<string>();
    const colKeys = new Set<string>();
    const dataMap = new Map<string, Map<string, number[]>>();

    df.forEach((row) => {
      const rk = String(row[indexCol] ?? '(blank)');
      const ck = String(row[colCol] ?? '(blank)');
      const val = parseFloat(String(row[valueCol] ?? '0'));
      rowKeys.add(rk);
      colKeys.add(ck);
      if (!dataMap.has(rk)) dataMap.set(rk, new Map());
      const inner = dataMap.get(rk)!;
      if (!inner.has(ck)) inner.set(ck, []);
      if (!isNaN(val)) inner.get(ck)!.push(val);
    });

    const colArr = Array.from(colKeys).sort();
    const rows = Array.from(rowKeys).sort().map((rk) => {
      const inner = dataMap.get(rk) ?? new Map();
      const obj: Record<string, string | number> = { [indexCol]: rk };
      colArr.forEach((ck) => {
        const vals = inner.get(ck) ?? [];
        obj[ck] = aggregate(vals, aggFunc);
      });
      return obj;
    });

    return { rows, cols: colArr };
  }, [df, indexCol, colCol, valueCol, aggFunc]);

  const handleExport = (rows: Record<string, unknown>[], totalRow?: Record<string, unknown>) => {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const all = totalRow ? [...rows, totalRow] : rows;
    const csv = [cols.join(','), ...all.map((r) => cols.map((c) => `"${String(r[c] ?? '')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pivot.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!df) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <AlertCircle className="w-12 h-12 mb-3 opacity-40" />
        <p className="font-medium">Upload data in the Data Quality Check tab first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Table2 className="w-5 h-5 text-white" />
          <span className="card-title">Pivot Table Settings</span>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Row (Index)</label>
            <select className="select-field" value={indexCol} onChange={(e) => setIndexCol(e.target.value)}>
              <option value="">Select column...</option>
              {catCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Column (Cross-tab)</label>
            <select className="select-field" value={colCol} onChange={(e) => setColCol(e.target.value)}>
              <option value="">Select column...</option>
              {catCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Values</label>
            <select className="select-field" value={valueCol} onChange={(e) => setValueCol(e.target.value)}>
              <option value="">Select column...</option>
              {numCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Aggregation</label>
            <select className="select-field" value={aggFunc} onChange={(e) => setAggFunc(e.target.value)}>
              {['count', 'sum', 'mean', 'min', 'max'].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Built-in summary table */}
      {builtinTable && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span className="card-title">Summary: Submissions by {indexCol}</span>
            <button
              onClick={() => handleExport(builtinTable.rows as Record<string, unknown>[], builtinTable.totalRow as Record<string, unknown>)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
          <div className="table-container rounded-none rounded-b-2xl">
            <table>
              <thead>
                <tr>
                  <th>{indexCol}</th>
                  <th className="text-right">Total Submissions</th>
                  <th className="text-right">Unique Households</th>
                </tr>
              </thead>
              <tbody>
                {builtinTable.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="font-medium">{String(row[indexCol])}</td>
                    <td className="text-right">{(row['Total Submissions'] as number).toLocaleString()}</td>
                    <td className="text-right">{(row['Unique Households'] as number).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td>TOTAL</td>
                  <td className="text-right">{builtinTable.totalRow['Total Submissions'].toLocaleString()}</td>
                  <td className="text-right">{builtinTable.totalRow['Unique Households'].toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom cross-tab pivot */}
      {pivotTable && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span className="card-title">Cross-tab: {indexCol} × {colCol} ({aggFunc} of {valueCol})</span>
            <button
              onClick={() => handleExport(pivotTable.rows as Record<string, unknown>[])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>{indexCol}</th>
                  {pivotTable.cols.map((c) => <th key={c} className="whitespace-nowrap">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {pivotTable.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="font-medium whitespace-nowrap">{String(row[indexCol])}</td>
                    {pivotTable.cols.map((c) => (
                      <td key={c} className="text-right">
                        {typeof row[c] === 'number' ? (row[c] as number).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!indexCol && (
        <div className="py-12 text-center text-slate-400">
          <Table2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Select a Row column to generate the pivot table</p>
        </div>
      )}
    </div>
  );
}
