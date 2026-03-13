import { Firmenregel, Gesamtstatistik, Segment, Segmentstats, Szenario, TagViewModel } from './types';
import { SEG_FARBEN } from './constants';


// Datum-Hilfsfunktionen


export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${t}`;
}

export function parseIso(iso: string): Date {
  const [y, m, t] = iso.split('-').map(Number);
  return new Date(y, m - 1, t);
}

export function istWochenende(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function daysInRange(start: string, end: string): string[] {
  const ergebnis: string[] = [];
  const cur = parseIso(start);
  const endDatum = parseIso(end);
  while (cur <= endDatum) {
    ergebnis.push(isoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return ergebnis;
}

export function daysDiff(vonIso: string, bisIso: string): number {
  const von = parseIso(vonIso);
  const bis = parseIso(bisIso);
  return Math.round((bis.getTime() - von.getTime()) / 86_400_000);
}

function addTage(d: Date, tage: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + tage);
  return r;
}


// Ostern (Gaußsche Formel)


export function calcEaster(jahr: number): Date {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(jahr, monat - 1, tag);
}


// Buß- und Bettag (Mittwoch vor dem 23. November)


function calcBussUndBettag(jahr: number): Date {
  const nov23 = new Date(jahr, 10, 23);
  const dow = nov23.getDay(); // 0=So … 6=Sa, 3=Mi
  const daysBack = dow >= 3 ? (dow - 3 || 7) : dow + 4;
  const result = new Date(nov23);
  result.setDate(23 - daysBack);
  return result;
}


// Feiertage - alle 16 Bundesländer


export function getHolidays(jahr: number, region: string): Map<string, string> {
  const feiertage = new Map<string, string>();
  const add = (d: Date, name: string) => feiertage.set(isoDate(d), name);
  const D = (m: number, t: number) => new Date(jahr, m - 1, t);

  const ostern      = calcEaster(jahr);
  const karfreitag  = addTage(ostern, -2);
  const himmelfahrt = addTage(ostern, 39);
  const pfingstmontag = addTage(ostern, 50);
  const fronleichnam  = addTage(ostern, 60);

  // Bundesweit 
  add(D(1,  1),  'Neujahr');
  add(karfreitag,    'Karfreitag');
  add(addTage(ostern, 1), 'Ostermontag');
  add(D(5,  1),  'Tag der Arbeit');
  add(himmelfahrt,   'Christi Himmelfahrt');
  add(pfingstmontag, 'Pfingstmontag');
  add(D(10, 3),  'Tag der Deutschen Einheit');
  add(D(12, 25), '1. Weihnachtstag');
  add(D(12, 26), '2. Weihnachtstag');

  // Heilige Drei Könige (6.1): BY, BW, ST 
  if (['DE-BY', 'DE-BW', 'DE-ST'].includes(region)) {
    add(D(1, 6), 'Heilige Drei Könige');
  }

  // Internationaler Frauentag (8.3): BE, MV 
  if (['DE-BE', 'DE-MV'].includes(region)) {
    add(D(3, 8), 'Internationaler Frauentag');
  }

  // Ostersonntag: BB 
  if (region === 'DE-BB') {
    add(ostern, 'Ostersonntag');
  }

  // Pfingstsonntag: BB 
  if (region === 'DE-BB') {
    add(addTage(ostern, 49), 'Pfingstsonntag');
  }

  // Fronleichnam: BW, BY, HE, NW, RP, SL 
  if (['DE-BW', 'DE-BY', 'DE-HE', 'DE-NW', 'DE-RP', 'DE-SL'].includes(region)) {
    add(fronleichnam, 'Fronleichnam');
  }

  // Mariä Himmelfahrt (15.8): BY, SL 
  if (['DE-BY', 'DE-SL'].includes(region)) {
    add(D(8, 15), 'Mariä Himmelfahrt');
  }

  // Weltkindertag (20.9): TH 
  if (region === 'DE-TH') {
    add(D(9, 20), 'Weltkindertag');
  }

  // Reformationstag (31.10): BB, HB, HH, MV, NI, SH, SN, ST, TH 
  if (['DE-BB', 'DE-HB', 'DE-HH', 'DE-MV', 'DE-NI', 'DE-SH', 'DE-SN', 'DE-ST', 'DE-TH'].includes(region)) {
    add(D(10, 31), 'Reformationstag');
  }

  // Allerheiligen (1.11): BW, BY, NW, RP, SL 
  if (['DE-BW', 'DE-BY', 'DE-NW', 'DE-RP', 'DE-SL'].includes(region)) {
    add(D(11, 1), 'Allerheiligen');
  }

  // Buß- und Bettag: SN 
  if (region === 'DE-SN') {
    add(calcBussUndBettag(jahr), 'Buß- und Bettag');
  }

  return feiertage;
}


// Firmenregeln


export function getFirmenregel(d: Date, firmenregeln: Firmenregel[]): Firmenregel | null {
  const monat = d.getMonth() + 1;
  const tag   = d.getDate();
  return firmenregeln.find(r => r.monat === monat && r.tag === tag) ?? null;
}


// Segment-Statistiken


export function calcSegment(segment: Segment, jahr: number, region: string, firmenregeln: Firmenregel[]): Segmentstats {
  // Segment auf das angezeigte Jahr beschränken
  const jahrStart = `${jahr}-01-01`;
  const jahrEnd   = `${jahr}-12-31`;
  const start = segment.start < jahrStart ? jahrStart : segment.start;
  const end   = segment.end   > jahrEnd   ? jahrEnd   : segment.end;

  if (start > end) {
    return { kalendertage: 0, wochenendtage: 0, feiertage: 0, halbeTage: 0, urlaubstage: 0 };
  }

  const feiertage = getHolidays(jahr, region);
  const tage = daysInRange(start, end);

  let kalendertage  = 0;
  let wochenendtage = 0;
  let feiertageTage = 0;
  let halbeTage     = 0;
  let urlaubstage   = 0;

  for (const iso of tage) {
    const d = parseIso(iso);
    kalendertage++;

    if (istWochenende(d)) { wochenendtage++; continue; }
    if (feiertage.has(iso)) { feiertageTage++; continue; }

    const regel = getFirmenregel(d, firmenregeln);
    if (regel) {
      halbeTage++;
      urlaubstage += regel.freierAnteil;
      continue;
    }

    urlaubstage++;
  }

  urlaubstage = Math.round(urlaubstage * 2) / 2;

  return { kalendertage, wochenendtage, feiertage: feiertageTage, halbeTage, urlaubstage };
}

export function calcTotals(
  szenario: Szenario,
  jahr: number,
  region: string,
  kontingent: number,
  firmenregeln: Firmenregel[],
): Gesamtstatistik {
  let urlaubstage   = 0;
  let feiertage     = 0;
  let wochenendtage = 0;

  for (const seg of szenario.segmente) {
    const stats = calcSegment(seg, jahr, region, firmenregeln);
    urlaubstage   += stats.urlaubstage;
    feiertage     += stats.feiertage;
    wochenendtage += stats.wochenendtage;
  }

  urlaubstage = Math.round(urlaubstage * 2) / 2;

  return {
    urlaubstage,
    segmente: szenario.segmente.length,
    feiertage,
    wochenendtage,
    resturlaub: Math.round((kontingent - urlaubstage) * 2) / 2,
  };
}


// TagViewModels


function calcSegmentPos(iso: string, alleTage: string[], idx: number): 'anfang' | 'ende' | 'mitte' | 'solo' {
  const prevIso = (i: string) => { const d = parseIso(i); d.setDate(d.getDate() - 1); return isoDate(d); };
  const nextIso = (i: string) => { const d = parseIso(i); d.setDate(d.getDate() + 1); return isoDate(d); };
  const isFirst = idx === 0 || alleTage[idx - 1] !== prevIso(iso);
  const isLast  = idx === alleTage.length - 1 || alleTage[idx + 1] !== nextIso(iso);
  if (isFirst && isLast) return 'solo';
  if (isFirst) return 'anfang';
  if (isLast)  return 'ende';
  return 'mitte';
}

export function buildMonthDays(
  jahr: number,
  monat: number,       // 0-based
  szenario: Szenario,
  feiertage: Map<string, string>,
  firmenregeln: Firmenregel[],
): TagViewModel[] {
  const heute = isoDate(new Date());
  const anzahlTage = new Date(jahr, monat + 1, 0).getDate();

  const segmentMap = new Map<string, { id: string; farbe: string; name: string; start: string; end: string; pos: 'anfang' | 'ende' | 'mitte' | 'solo' }>();
  for (const seg of szenario.segmente) {
    const alleTage = daysInRange(seg.start, seg.end);
    alleTage.forEach((iso, idx) => {
      segmentMap.set(iso, { id: seg.id, farbe: seg.farbe, name: seg.name, start: seg.start, end: seg.end, pos: calcSegmentPos(iso, alleTage, idx) });
    });
  }

  const ergebnis: TagViewModel[] = [];
  for (let t = 1; t <= anzahlTage; t++) {
    const d   = new Date(jahr, monat, t);
    const iso = isoDate(d);
    const segData     = segmentMap.get(iso) ?? null;
    const firmenregel = getFirmenregel(d, firmenregeln);

    ergebnis.push({
      iso,
      tag: t,
      istWochenende: istWochenende(d),
      istHeute: iso === heute,
      feiertagName: feiertage.get(iso) ?? null,
      firmenregel,
      istPflichturlaub: firmenregel?.pflichturlaub ?? false,
      segment: segData ? { id: segData.id, farbe: segData.farbe, name: segData.name, start: segData.start, end: segData.end } : null,
      segmentPos: segData?.pos ?? null,
      istAuswahl: false,
      auswahlPos: null,
      istVerschiebevorschau: false,
    });
  }

  return ergebnis;
}


// Segment-Operationen (immutabel)


export function shiftSegment(seg: Segment, deltaTage: number): Segment {
  const neuerStart = parseIso(seg.start);
  neuerStart.setDate(neuerStart.getDate() + deltaTage);
  const neuesEnd = parseIso(seg.end);
  neuesEnd.setDate(neuesEnd.getDate() + deltaTage);
  return { ...seg, start: isoDate(neuerStart), end: isoDate(neuesEnd) };
}

export function hasOverlap(segmente: Segment[], start: string, end: string, ignoreId?: string): boolean {
  for (const seg of segmente) {
    if (seg.id === ignoreId) continue;
    if (seg.start <= end && seg.end >= start) return true;
  }
  return false;
}

export function uncoveredPflichtTage(
  firmenregeln: Firmenregel[],
  szenario: Szenario,
  jahr: number,
): Set<string> {
  const result = new Set<string>();
  for (const r of firmenregeln) {
    if (!r.pflichturlaub) continue;
    const d = new Date(jahr, r.monat - 1, r.tag);
    if (istWochenende(d)) continue;
    const iso = isoDate(d);
    const covered = szenario.segmente.some(s => s.start <= iso && s.end >= iso);
    if (!covered) result.add(r.id);
  }
  return result;
}

export function nextColor(genutztefarben: string[]): string {
  for (const farbe of SEG_FARBEN) {
    if (!genutztefarben.includes(farbe)) return farbe;
  }
  return SEG_FARBEN[0];
}
