import { DataRow, ComparisonResult, SimilarityStats } from '../types';

// Display label → actual Excel column name
export const TARGET_VARIABLE_MAP: Record<string, string> = {
  'How many people are there in this household?': 'Householders',
  '7. Sleeping spaces':                           'SleepingSpaces',
  'Campaign nets hung':                           'calc_num_campaign_nets_hung',
  'Campaign nets not hung':                       'calc_num_campaign_nets_not_hung',
  'Are nets used correctly?':                     'NetsUsedCorrectly',
};

// Keep display labels as the exported list (used by the filter dropdown)
export const TARGET_VARIABLES = Object.keys(TARGET_VARIABLE_MAP);

function calcSimilarity(val1: unknown, val2: unknown): boolean {
  if (val1 === null && val2 === null) return true;
  if (val1 === null || val2 === null) return false;
  const s1 = String(val1).trim().toLowerCase();
  const s2 = String(val2).trim().toLowerCase();
  return s1 === s2;
}

export function runSimilarityCheck(
  mainData: DataRow[],
  revisitData: DataRow[],
  lgaFilter?: string
): { comparisons: ComparisonResult[]; stats: SimilarityStats[] } {
  let filtered = mainData;
  if (lgaFilter && lgaFilter !== 'All') {
    filtered = mainData.filter((r) => String(r['calc_l4_name'] ?? '') === lgaFilter);
  }

  const revisitIndex = new Map<string, DataRow>();
  revisitData.forEach((r) => {
    const id = String(r['calc_household_id'] ?? '');
    if (id) revisitIndex.set(id, r);
  });

  const comparisons: ComparisonResult[] = [];
  const stats: SimilarityStats[] = [];

  for (const label of TARGET_VARIABLES) {
    const col = TARGET_VARIABLE_MAP[label] ?? label;
    let matches = 0;
    let total = 0;

    for (const mainRow of filtered) {
      const hhId = String(mainRow['calc_household_id'] ?? '');
      const revisitRow = revisitIndex.get(hhId);
      if (!revisitRow) continue;

      const val1 = col in mainRow ? mainRow[col] : undefined;
      const val2 = col in revisitRow ? revisitRow[col] : undefined;

      if (val1 === undefined && val2 === undefined) continue;
      total++;

      const isMatch = calcSimilarity(val1, val2);
      if (isMatch) matches++;

      const lga = String(mainRow['calc_l4_name'] ?? '');
      const village = String(mainRow['calc_village_name'] ?? '');

      comparisons.push({
        variable: label,
        village: lga && village ? `${lga} - ${village}` : village || lga || 'N/A',
        householdId: hhId,
        mainValue: val1,
        revisitValue: val2,
        match: isMatch,
        score: isMatch ? 1 : -1,
      });
    }

    if (total > 0) {
      stats.push({
        variable: label,
        matchingRecords: matches,
        totalRecords: total,
        similarityRate: (matches / total) * 100,
      });
    }
  }

  return { comparisons, stats };
}
