import { ValidationRow, EnumeratorStats } from '../types';

function formatMinutes(minutes: number): string {
  if (!minutes || isNaN(minutes)) return 'N/A';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function parseDateStr(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

const ENUM_COL_CANDIDATES = [
  'username',
  'Username',
  'UserName',
  'Enumerator User Name',
  'enumerator_user_name',
  'EnumeratorName',
  'enumerator_name',
  '_enumerator_name',
  'Enumerator Name',
  'EnumeratorUserName',
];

function detectEnumeratorColumn(row: ValidationRow): string {
  for (const col of ENUM_COL_CANDIDATES) {
    if (col in row && String(row[col] ?? '').trim()) return col;
  }
  // Fallback: find any column whose name contains "enumerator" or "username"
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase();
    if ((lower.includes('enumerator') || lower === 'username') && String(row[key] ?? '').trim()) return key;
  }
  return 'Enumerator User Name';
}

export function buildEnumeratorStats(data: ValidationRow[]): EnumeratorStats[] {
  if (!data.length) return [];

  // Auto-detect the enumerator column from the first non-empty row
  const enumCol = detectEnumeratorColumn(data[0]);

  const groups = new Map<string, ValidationRow[]>();
  data.forEach((row) => {
    const name = String(row[enumCol] ?? '').trim();
    if (!name) return;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(row);
  });

  const result: EnumeratorStats[] = [];

  groups.forEach((rows, name) => {
    const total = rows.length;
    const flagged = rows.filter((r) => r.Overall_Status === 'FLAGGED').length;
    const valid = total - flagged;
    const qualityScore = total > 0 ? (valid / total) * 100 : 0;

    // Primary LGA
    const lgaCounts = new Map<string, number>();
    rows.forEach((r) => {
      const lga = String(r['calc_l4_name'] ?? '');
      if (lga) lgaCounts.set(lga, (lgaCounts.get(lga) ?? 0) + 1);
    });
    let primaryLga = 'Unknown';
    let maxCount = 0;
    lgaCounts.forEach((count, lga) => {
      if (count > maxCount) { maxCount = count; primaryLga = lga; }
    });

    // Error counts
    const basicErrors = rows.filter((r) => r.Basic_Check !== 'PASS').length;
    const timeErrors = rows.filter((r) => r.Time_Check !== 'PASS').length;
    const gpsErrors = rows.filter((r) => r.GPS_Check !== 'PASS').length;
    const precisionErrors = rows.filter((r) => r.Precision_Check !== 'PASS').length;
    const stackpointErrors = rows.filter((r) => r.Stackpoint_Check !== 'PASS').length;
    const proximityErrors = rows.filter((r) => r.Proximity_Check !== 'PASS').length;
    const duplicateErrors = rows.filter((r) => r.Duplicate_Check !== 'PASS').length;
    const hhGapErrors = rows.filter((r) => r.HH_Interview_Gap_Flag !== 'PASS').length;

    // Interview duration stats
    const durations = rows
      .map((r) => r.interview_duration)
      .filter((d): d is number => d !== undefined && !isNaN(d));
    const avgInterviewDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const totalTimeSpent = durations.reduce((a, b) => a + b, 0);

    // Date range
    const dates = rows
      .map((r) => parseDateStr(r['End of Survey']))
      .filter((d): d is Date => d !== null);
    let dateRange = 'N/A';
    if (dates.length > 0) {
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      dateRange = `${fmt(sorted[0])} to ${fmt(sorted[sorted.length - 1])}`;
    }

    // Locations worked
    const lgaMap = new Map<string, { wards: Set<string>; villages: Set<string> }>();
    rows.forEach((r) => {
      const lga = String(r['calc_l4_name'] ?? '');
      if (!lga) return;
      if (!lgaMap.has(lga)) lgaMap.set(lga, { wards: new Set(), villages: new Set() });
      const entry = lgaMap.get(lga)!;
      const ward = String(r['calc_ward_name'] ?? '');
      const village = String(r['calc_village_name'] ?? '');
      if (ward) entry.wards.add(ward);
      if (village) entry.villages.add(village);
    });
    const locationsWorked = Array.from(lgaMap.entries()).map(([lga, { wards, villages }]) => ({
      lga,
      wards: Array.from(wards),
      villages: Array.from(villages),
    }));

    // Villages
    const allVillages = Array.from(
      new Set(rows.map((r) => String(r['calc_village_name'] ?? '')).filter(Boolean))
    ).sort();

    result.push({
      name,
      primaryLga,
      totalSurveys: total,
      validSurveys: valid,
      flaggedSurveys: flagged,
      qualityScore,
      basicErrors,
      timeErrors,
      gpsErrors,
      precisionErrors,
      stackpointErrors,
      proximityErrors,
      duplicateErrors,
      hhGapErrors,
      avgInterviewDuration,
      totalTimeSpent,
      dateRange,
      locationsWorked,
      flaggedRecords: rows.filter((r) => r.Overall_Status === 'FLAGGED'),
      villages: allVillages,
    });
  });

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function getPerformanceBadge(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: '🌟 Very Good', color: '#16a34a', bg: '#dcfce7' };
  if (score >= 60) return { label: '⚠️ Needs Improvement', color: '#d97706', bg: '#fef3c7' };
  if (score >= 40) return { label: '📚 Requires Training', color: '#ea580c', bg: '#ffedd5' };
  return { label: '❌ Recommended for Dismissal', color: '#dc2626', bg: '#fee2e2' };
}

export { formatMinutes };
