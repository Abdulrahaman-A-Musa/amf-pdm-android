import React, { useState, useMemo } from 'react';
import { BarChart2, PieChart, AlertCircle, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
} from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { getCategoricalColumns, getUniqueValues } from '../../utils/excelUtils';
import { DataRow } from '../../types';

const COLORS = [
  '#0090fc', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2',
  '#e11d48', '#ca8a04', '#4338ca', '#065f46', '#7c3aed', '#b45309',
];

export default function FrequencyAnalysis() {
  const { qualityData } = useAppStore();
  const [variable, setVariable] = useState('');
  const [chartTypes, setChartTypes] = useState<string[]>(['Bar Chart']);
  const [lgaFilter, setLgaFilter] = useState('All');

  const df = qualityData;
  const catCols = useMemo(() => (df ? getCategoricalColumns(df) : []), [df]);
  const lgaChoices = useMemo(() => (df ? ['All', ...getUniqueValues(df, 'calc_l4_name')] : ['All']), [df]);

  const filteredDf = useMemo(() => {
    if (!df) return [];
    if (lgaFilter === 'All') return df;
    return df.filter((r) => String(r['calc_l4_name'] ?? '') === lgaFilter);
  }, [df, lgaFilter]);

  const freqData = useMemo(() => {
    if (!filteredDf.length || !variable) return [];
    const distinct = new Map<string, Set<string>>();
    filteredDf.forEach((row) => {
      const val = String(row[variable] ?? '(blank)');
      const id = String(row['calc_household_id'] ?? '');
      if (!distinct.has(val)) distinct.set(val, new Set());
      if (id) distinct.get(val)!.add(id);
    });
    const total = Array.from(distinct.values()).reduce((s, v) => s + v.size, 0);
    return Array.from(distinct.entries())
      .map(([name, ids]) => ({
        name,
        count: ids.size,
        pct: total > 0 ? ((ids.size / total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredDf, variable]);

  const totalCount = freqData.reduce((s, r) => s + r.count, 0);

  const toggleChart = (type: string) => {
    setChartTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleExport = () => {
    const csv = [
      `${variable},Frequency,Percentage`,
      ...freqData.map((r) => `"${r.name}",${r.count},${r.pct}%`),
      `TOTAL,${totalCount},100%`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `freq_${variable}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { name: string; count: number; pct: string } }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{d.name}</p>
        <p className="text-primary-600">Count: <strong>{d.count.toLocaleString()}</strong></p>
        <p className="text-slate-500">Share: <strong>{d.pct}%</strong></p>
      </div>
    );
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
      {/* Controls */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-white" />
          <span className="card-title">Frequency Analysis Settings</span>
        </div>
        <div className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-56">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Variable</label>
            <select className="select-field" value={variable} onChange={(e) => setVariable(e.target.value)}>
              <option value="">Select variable for analysis...</option>
              {catCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">LGA Filter</label>
            <select className="select-field" value={lgaFilter} onChange={(e) => setLgaFilter(e.target.value)}>
              {lgaChoices.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Chart Types</label>
            <div className="flex gap-2">
              {['Bar Chart', 'Pie Chart'].map((t) => (
                <button
                  key={t}
                  onClick={() => toggleChart(t)}
                  className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                    chartTypes.includes(t)
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {freqData.length > 0 && (
        <>
          {/* Frequency table */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span className="card-title">Frequency Table: {variable}</span>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            <div className="table-container rounded-none rounded-b-2xl">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{variable}</th>
                    <th className="text-right">Frequency</th>
                    <th className="text-right">Percentage</th>
                    <th>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {freqData.map((row, i) => (
                    <tr key={i}>
                      <td className="text-slate-400 w-8">{i + 1}</td>
                      <td className="font-medium">{row.name}</td>
                      <td className="text-right font-mono">{row.count.toLocaleString()}</td>
                      <td className="text-right font-mono">{row.pct}%</td>
                      <td className="min-w-32">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${row.pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <td></td>
                    <td>TOTAL</td>
                    <td className="text-right font-mono">{totalCount.toLocaleString()}</td>
                    <td className="text-right font-mono">100%</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className={`grid gap-6 ${chartTypes.length === 2 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
            {chartTypes.includes('Bar Chart') && (
              <div className="card">
                <div className="card-header flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-white" />
                  <span className="card-title">Bar Chart</span>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={freqData.slice(0, 20)} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        height={70}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {freqData.slice(0, 20).map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartTypes.includes('Pie Chart') && (
              <div className="card">
                <div className="card-header flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-white" />
                  <span className="card-title">Pie Chart</span>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <RechartsPie>
                      <Pie
                        data={freqData.slice(0, 12)}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={({ name, pct }) => `${String(name).slice(0, 12)}…: ${pct}%`}
                        labelLine
                      >
                        {freqData.slice(0, 12).map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => [val.toLocaleString(), 'Count']} />
                      <Legend
                        formatter={(value) => <span style={{ fontSize: 11, color: '#64748b' }}>{String(value).slice(0, 20)}</span>}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!variable && (
        <div className="py-12 text-center text-slate-400">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Select a variable to generate frequency analysis</p>
        </div>
      )}
    </div>
  );
}
