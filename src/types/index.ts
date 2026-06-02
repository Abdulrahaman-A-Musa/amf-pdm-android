export interface DataRow {
  [key: string]: unknown;
}

export interface ValidationRow extends DataRow {
  Basic_Check: string;
  Time_Check: string;
  GPS_Check: string;
  Precision_Check: string;
  Stackpoint_Check: string;
  Proximity_Check: string;
  Duplicate_Check: string;
  HH_Interview_Gap_Flag: string;
  Overall_Status: 'VALID' | 'FLAGGED';
  interview_duration?: number;
  time_gap_minutes?: number;
}

export interface ValidationSummary {
  totalRecords: number;
  validRecords: number;
  flaggedRecords: number;
  qualityScore: number;
  basicErrors: number;
  timeErrors: number;
  gpsErrors: number;
  precisionErrors: number;
  stackpointErrors: number;
  proximityErrors: number;
  duplicateErrors: number;
  hhGapErrors: number;
}

export interface LocationData {
  lga: string;
  wards: string[];
  villages: string[];
}

export interface EnumeratorStats {
  name: string;
  primaryLga: string;
  totalSurveys: number;
  validSurveys: number;
  flaggedSurveys: number;
  qualityScore: number;
  basicErrors: number;
  timeErrors: number;
  gpsErrors: number;
  precisionErrors: number;
  stackpointErrors: number;
  proximityErrors: number;
  duplicateErrors: number;
  hhGapErrors: number;
  avgInterviewDuration: number;
  totalTimeSpent: number;
  dateRange: string;
  locationsWorked: LocationData[];
  flaggedRecords: ValidationRow[];
  villages: string[];
}

export interface ComparisonResult {
  variable: string;
  village: string;
  householdId: string;
  mainValue: unknown;
  revisitValue: unknown;
  match: boolean;
  score: number;
}

export interface SimilarityStats {
  variable: string;
  matchingRecords: number;
  totalRecords: number;
  similarityRate: number;
}

export interface PivotResult {
  [key: string]: string | number;
  totalSubmissions: number;
  validSubmissions: number;
}

export type TabId = 'comparison' | 'quality' | 'pivot' | 'frequency';

export interface AppState {
  isLoggedIn: boolean;
  activeTab: TabId;
  mainData: DataRow[] | null;
  revisitData: DataRow[] | null;
  qualityData: DataRow[] | null;
  validationData: ValidationRow[] | null;
  isProcessing: boolean;
}
