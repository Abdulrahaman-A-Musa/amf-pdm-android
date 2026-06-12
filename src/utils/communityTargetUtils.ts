import { CommunityTarget } from '../types';

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCommunityCSV(text: string): CommunityTarget[] {
  const clean = text.replace(/^﻿/, '').replace(/^ï»¿/, '');
  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  const lgaIdx  = header.findIndex(h => h === 'lga');
  const wardIdx = header.findIndex(h => h === 'ward');
  const commIdx = header.findIndex(h => h.startsWith('communit'));
  const targIdx = header.findIndex(h => h.startsWith('targ'));

  if (lgaIdx < 0 || commIdx < 0 || targIdx < 0) return [];

  const results: CommunityTarget[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const lga  = fields[lgaIdx]  ?? '';
    const ward = wardIdx >= 0 ? (fields[wardIdx] ?? '') : '';
    const comm = fields[commIdx] ?? '';
    const targ = Number(fields[targIdx] ?? '');

    if (lga.toLowerCase().startsWith('grand') || !comm || !lga) continue;
    if (isNaN(targ)) continue;

    results.push({ lga, ward, community: comm, target: targ });
  }

  return results;
}
