import { DataRow, ValidationRow, ValidationSummary } from '../types';

const LAT_COL = '_FirstVisitGPS_latitude';
const LON_COL = '_FirstVisitGPS_longitude';

const LAT_CANDIDATES = [
  '_FirstVisitGPS_latitude', 'FirstVisitGPS_latitude',
  '_GPS_latitude', 'GPS_latitude', 'gps_latitude',
  '_latitude', 'latitude', 'Latitude', 'lat',
];
const LON_CANDIDATES = [
  '_FirstVisitGPS_longitude', 'FirstVisitGPS_longitude',
  '_GPS_longitude', 'GPS_longitude', 'gps_longitude',
  '_longitude', 'longitude', 'Longitude', 'lon',
];

function detectGpsColumns(row: Record<string, unknown>): { lat: string; lon: string } {
  let latCol = LAT_COL;
  let lonCol = LON_COL;
  for (const c of LAT_CANDIDATES) {
    if (c in row) { latCol = c; break; }
  }
  if (!(latCol in row)) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes('latitude')) { latCol = key; break; }
    }
  }
  for (const c of LON_CANDIDATES) {
    if (c in row) { lonCol = c; break; }
  }
  if (!(lonCol in row)) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes('longitude')) { lonCol = key; break; }
    }
  }
  return { lat: latCol, lon: lonCol };
}

// GPS_COMBINED_RE matches column names that likely hold a combined "lat lon alt acc" geopoint string.
const GPS_COMBINED_RE = /gps|geopoint|location|coordinates/i;

function resolveGps(
  row: Record<string, unknown>,
  latCol: string,
  lonCol: string,
): { lat: number | null; lon: number | null } {
  // 1. Try the explicit component fields first
  const latNum = parseFloat(String(row[latCol] ?? ''));
  const lonNum = parseFloat(String(row[lonCol] ?? ''));
  if (!isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0) {
    return { lat: latNum, lon: lonNum };
  }

  // 2. Fallback: scan for a combined geopoint string (e.g. "12.3456 8.9012 500 3.2")
  //    This handles the common KoBoToolbox case where the parent GPS field has the data
  //    but the separate _latitude/_longitude component keys are null or absent.
  for (const key of Object.keys(row)) {
    if (!GPS_COMBINED_RE.test(key)) continue;
    if (key === latCol || key === lonCol) continue;
    const val = String(row[key] ?? '').trim();
    if (!val || !val.includes(' ')) continue;
    const parts = val.split(/\s+/);
    if (parts.length < 2) continue;
    const pLat = parseFloat(parts[0]);
    const pLon = parseFloat(parts[1]);
    if (!isNaN(pLat) && !isNaN(pLon) && pLat !== 0 && pLon !== 0 &&
        Math.abs(pLat) <= 90 && Math.abs(pLon) <= 180) {
      return { lat: pLat, lon: pLon };
    }
  }

  return { lat: null, lon: null };
}

const START_COL_CANDIDATES = [
  'calc_first_visit_last_change',
  'calc_consent_last_change',
  'start',
  'starttime',
  'start_time',
  'StartTime',
  'start_datetime',
  'SubmissionDate',
];

const END_COL_CANDIDATES = [
  'End of Survey',
  'end',
  'endtime',
  'end_time',
  'EndTime',
  'end_datetime',
  'SubmissionDate',
];

function findColumn(row: Record<string, unknown>, candidates: string[]): string | null {
  for (const col of candidates) {
    if (col in row) return col;
  }
  return null;
}

function parseTimestamp(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim().replace(/\s+/g, ' ');
  if (!str) return null;

  // Excel serial date numbers
  const num = Number(str);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + num * 86400000);
  }

  // Explicit M/D/YYYY H:MM:SS AM/PM  (e.g. "12/1/2025 10:04:34 AM")
  const ampm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[4]);
    const isPM = ampm[7].toUpperCase() === 'PM';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return new Date(parseInt(ampm[3]), parseInt(ampm[1]) - 1, parseInt(ampm[2]), h, parseInt(ampm[5]), parseInt(ampm[6]));
  }

  // ISO / other standard formats
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export function validateData(df: DataRow[]): ValidationRow[] {
  const result: ValidationRow[] = df.map((row) => ({
    ...row,
    Basic_Check: 'PASS',
    Time_Check: 'PASS',
    GPS_Check: 'PASS',
    Precision_Check: 'PASS',
    Stackpoint_Check: 'PASS',
    Proximity_Check: 'PASS',
    Duplicate_Check: 'PASS',
    HH_Interview_Gap_Flag: 'PASS',
    Overall_Status: 'VALID' as const,
  }));

  // Auto-detect start/end timestamp columns from first row
  const firstRow = result[0] ?? {};
  const startCol = findColumn(firstRow, START_COL_CANDIDATES);
  const endCol = findColumn(firstRow, END_COL_CANDIDATES);

  // Auto-detect GPS columns, then resolve actual lat/lon values for every row.
  // resolveGps tries the component fields first (_FirstVisitGPS_latitude etc.) and
  // falls back to parsing the combined KoBoToolbox geopoint string (e.g. FirstVisitGPS).
  const { lat: LAT_COL_USE, lon: LON_COL_USE } = detectGpsColumns(firstRow);
  const resolvedGps = result.map(row => resolveGps(row, LAT_COL_USE, LON_COL_USE));
  console.log('[AMF-PDM] GPS cols:', LAT_COL_USE, LON_COL_USE,
    '| resolved valid:', resolvedGps.filter(g => g.lat !== null).length, '/', result.length);

  console.log('[AMF-PDM] All columns:', Object.keys(firstRow));
  console.log('[AMF-PDM] Detected startCol:', startCol, '→', firstRow[startCol ?? '']);
  console.log('[AMF-PDM] Detected endCol:  ', endCol,   '→', firstRow[endCol ?? '']);

  // Calculate interview_duration from timestamps
  let durationCount = 0;
  result.forEach((row) => {
    const consentTime = startCol ? parseTimestamp(row[startCol]) : null;
    const endTime = endCol ? parseTimestamp(row[endCol]) : null;
    if (consentTime && endTime) {
      const diffMs = Math.abs(consentTime.getTime() - endTime.getTime());
      row.interview_duration = diffMs / 60000;
      durationCount++;
    }
  });
  console.log('[AMF-PDM] interview_duration computed for', durationCount, '/', result.length, 'rows');

  // 1. Basic Check — only evaluate columns that actually exist in this dataset
  const BASIC_HH_COLS = ['HouseholdFound', 'household_found', 'calc_household_found', 'hh_found'];
  const BASIC_FV_COLS = ['FirstVisitPresent', 'first_visit_present', 'calc_first_visit_present', 'first_visit'];
  const BASIC_CONSENT_COLS = ['Consent', 'consent', 'calc_consent', 'respondent_consent'];
  const hhFoundCol = findColumn(firstRow, BASIC_HH_COLS);
  const firstVisitCol = findColumn(firstRow, BASIC_FV_COLS);
  const consentCol = findColumn(firstRow, BASIC_CONSENT_COLS);

  result.forEach((row) => {
    const hhFound = hhFoundCol ? String(row[hhFoundCol] ?? '').toLowerCase() : null;
    const firstVisit = firstVisitCol ? String(row[firstVisitCol] ?? '').toLowerCase() : null;
    const consent = consentCol ? String(row[consentCol] ?? '').toLowerCase() : null;

    const hhFail = hhFound !== null && !hhFound.includes('yes') && hhFound !== 'null';
    const firstVisitFail = firstVisit !== null && !firstVisit.includes('yes') && !firstVisit.includes('no_but_will_return') && firstVisit !== 'null';
    const consentFail = consent !== null && !consent.includes('yes') && consent !== 'null';

    if (hhFail || firstVisitFail || consentFail) {
      row.Basic_Check = '❌ Basic Error';
      row.Overall_Status = 'FLAGGED';
    }
  });

  // 2. Duration Check
  result.forEach((row) => {
    if (row.interview_duration !== undefined) {
      if (row.interview_duration < 10 || row.interview_duration > 30) {
        row.Time_Check = `❌ Duration Error (${row.interview_duration.toFixed(1)}m)`;
        row.Overall_Status = 'FLAGGED';
      }
    }
  });

  // 3. GPS Check — uses pre-resolved lat/lon (handles combined geopoint fallback)
  result.forEach((row, idx) => {
    const { lat, lon } = resolvedGps[idx];
    if (lat === null || lon === null) {
      row.GPS_Check = '❌ Missing Coordinates';
      row.Overall_Status = 'FLAGGED';
    }
  });

  // 4. Precision Check — flag only if accuracy worse than 10m
  result.forEach((row) => {
    const acc = parseFloat(String(row['calc_accuracy'] ?? ''));
    if (!isNaN(acc) && acc > 10) {
      row.Precision_Check = `❌ Precision Error (${acc}m)`;
      row.Overall_Status = 'FLAGGED';
    }
  });

  // 5. Stackpoint Check — same exact lat/lon pair
  const coordMap = new Map<string, number[]>();
  result.forEach((_, idx) => {
    const { lat, lon } = resolvedGps[idx];
    if (lat !== null && lon !== null) {
      const key = `${lat}|${lon}`;
      if (!coordMap.has(key)) coordMap.set(key, []);
      coordMap.get(key)!.push(idx);
    }
  });
  coordMap.forEach((indices) => {
    if (indices.length > 1) {
      indices.forEach((idx) => {
        result[idx].Stackpoint_Check = `❌ Stackpoint (${indices.length} HHs same GPS)`;
        result[idx].Overall_Status = 'FLAGGED';
      });
    }
  });

  // 6. Proximity Check (~30m ≈ 0.0003 degrees)
  const validCoords = resolvedGps
    .map(({ lat, lon }, idx) => ({ idx, lat: lat ?? 0, lon: lon ?? 0 }))
    .filter(({ lat, lon }) => lat !== 0 && lon !== 0);

  const PROX = 0.0003;
  const limit = Math.min(validCoords.length, 800);
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < Math.min(limit, i + 60); j++) {
      const latD = Math.abs(validCoords[i].lat - validCoords[j].lat);
      const lonD = Math.abs(validCoords[i].lon - validCoords[j].lon);
      // Skip if already flagged as stackpoint (identical coords)
      if (latD < PROX && lonD < PROX && (latD > 0 || lonD > 0)) {
        result[validCoords[i].idx].Proximity_Check = '❌ Proximity Error (Too Close)';
        result[validCoords[j].idx].Proximity_Check = '❌ Proximity Error (Too Close)';
        result[validCoords[i].idx].Overall_Status = 'FLAGGED';
        result[validCoords[j].idx].Overall_Status = 'FLAGGED';
      }
    }
  }

  // 7. Duplicate Check — flag 2nd and subsequent occurrences only, retain first
  const hhFirstSeen = new Set<string>();
  result.forEach((row) => {
    const id = String(row['calc_household_id'] ?? '').trim();
    if (!id) return;
    if (hhFirstSeen.has(id)) {
      row.Duplicate_Check = '❌ Duplicate Data';
      row.Overall_Status = 'FLAGGED';
    } else {
      hhFirstSeen.add(id);
    }
  });

  // 8. HH Interview Gap Check — < 15 min between consecutive records per enumerator
  const ENUM_COLS = ['username', 'Enumerator User Name', 'enumerator_name', 'EnumeratorName', 'Enumerator Name'];
  const enumCol = findColumn(firstRow, ENUM_COLS) ?? 'username';
  const enumGroups = new Map<string, { idx: number; time: Date }[]>();
  result.forEach((row, idx) => {
    const name = String(row[enumCol] ?? '').trim();
    const time = startCol ? parseTimestamp(row[startCol]) : null;
    if (name && time) {
      if (!enumGroups.has(name)) enumGroups.set(name, []);
      enumGroups.get(name)!.push({ idx, time });
    }
  });
  enumGroups.forEach((entries) => {
    entries.sort((a, b) => a.time.getTime() - b.time.getTime());
    for (let i = 1; i < entries.length; i++) {
      const gap = (entries[i].time.getTime() - entries[i - 1].time.getTime()) / 60000;
      if (gap >= 0 && gap < 15) {
        result[entries[i].idx].HH_Interview_Gap_Flag = `❌ Transition Error (${gap.toFixed(1)} min gap)`;
        result[entries[i].idx].Overall_Status = 'FLAGGED';
        result[entries[i].idx].time_gap_minutes = gap;
      }
    }
  });

  const flaggedCount = result.filter(r => r.Overall_Status === 'FLAGGED').length;
  console.log('[AMF-PDM] Flagged:', flaggedCount, '/', result.length,
    '| Basic:', result.filter(r => r.Basic_Check !== 'PASS').length,
    '| GPS:', result.filter(r => r.GPS_Check !== 'PASS').length,
    '| Precision:', result.filter(r => r.Precision_Check !== 'PASS').length,
    '| Duplicate:', result.filter(r => r.Duplicate_Check !== 'PASS').length,
    '| Gap:', result.filter(r => r.HH_Interview_Gap_Flag !== 'PASS').length,
  );

  return result;
}

export function getValidationSummary(data: ValidationRow[]): ValidationSummary {
  const total = data.length;
  const valid = data.filter((r) => r.Overall_Status === 'VALID').length;
  const flagged = total - valid;
  return {
    totalRecords: total,
    validRecords: valid,
    flaggedRecords: flagged,
    qualityScore: total > 0 ? (valid / total) * 100 : 0,
    basicErrors: data.filter((r) => r.Basic_Check !== 'PASS').length,
    timeErrors: data.filter((r) => r.Time_Check !== 'PASS').length,
    gpsErrors: data.filter((r) => r.GPS_Check !== 'PASS').length,
    precisionErrors: data.filter((r) => r.Precision_Check !== 'PASS').length,
    stackpointErrors: data.filter((r) => r.Stackpoint_Check !== 'PASS').length,
    proximityErrors: data.filter((r) => r.Proximity_Check !== 'PASS').length,
    duplicateErrors: data.filter((r) => r.Duplicate_Check !== 'PASS').length,
    hhGapErrors: data.filter((r) => r.HH_Interview_Gap_Flag !== 'PASS').length,
  };
}

export function getMapData(data: ValidationRow[]) {
  const { lat: LAT, lon: LON } = detectGpsColumns(data[0] ?? {});
  return data
    .filter(
      (r) => r.Stackpoint_Check !== 'PASS' || r.Proximity_Check !== 'PASS'
    )
    .map((r) => ({
      lat: parseFloat(String(r[LAT] ?? '')),
      lon: parseFloat(String(r[LON] ?? '')),
      hhId: String(r['calc_household_id'] ?? 'N/A'),
      stackpointIssue: r.Stackpoint_Check !== 'PASS',
      proximityIssue: r.Proximity_Check !== 'PASS',
      stackpointMsg: r.Stackpoint_Check,
      proximityMsg: r.Proximity_Check,
      village: String(r['calc_village_name'] ?? 'N/A'),
    }))
    .filter((r) => !isNaN(r.lat) && !isNaN(r.lon) && r.lat !== 0 && r.lon !== 0);
}

export const LAT_COLUMN = LAT_COL;
export const LON_COLUMN = LON_COL;
