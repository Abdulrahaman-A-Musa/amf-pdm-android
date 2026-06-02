import * as XLSX from 'xlsx';
import { DataRow } from '../types';

export async function readExcelFile(file: File): Promise<DataRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<DataRow>(worksheet, {
          defval: null,
          raw: true,
        });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

export function getColumnNames(data: DataRow[]): string[] {
  if (!data.length) return [];
  return Object.keys(data[0]);
}

export function getUniqueValues(data: DataRow[], column: string): string[] {
  const seen = new Set<string>();
  data.forEach((row) => {
    const val = row[column];
    if (val !== null && val !== undefined && val !== '') {
      seen.add(String(val));
    }
  });
  return Array.from(seen).sort();
}

export function getCategoricalColumns(data: DataRow[]): string[] {
  if (!data.length) return [];
  const cols = Object.keys(data[0]);
  return cols.filter((col) => {
    const samples = data.slice(0, 50).map((r) => r[col]).filter((v) => v !== null && v !== undefined);
    return samples.some((v) => isNaN(Number(v)));
  });
}

export function getNumericColumns(data: DataRow[]): string[] {
  if (!data.length) return [];
  const cols = Object.keys(data[0]);
  return cols.filter((col) => {
    const samples = data.slice(0, 50).map((r) => r[col]).filter((v) => v !== null && v !== '');
    return samples.length > 0 && samples.every((v) => !isNaN(Number(v)));
  });
}
