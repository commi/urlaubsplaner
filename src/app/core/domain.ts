import { Firmenregel, Gesamtstatistik, IsoDate, Segment, Segmentstats, Szenario, TagViewModel } from './types';
import { SEG_FARBEN } from './constants';


// Datum-Hilfsfunktionen


/** Convert a PlainDate to an IsoDate string. */
export function isoString(date: Temporal.PlainDate): IsoDate {
  return date.toString() as IsoDate;
}

export function addDays(date: IsoDate, delta: number): IsoDate {
  return isoString(Temporal.PlainDate.from(date).add({ days: delta }));
}

export function daysInRange(start: IsoDate, end: IsoDate): IsoDate[] {
  const ergebnis: IsoDate[] = [];
  let cur = Temporal.PlainDate.from(start);
  const endDatum = Temporal.PlainDate.from(end);
  while (Temporal.PlainDate.compare(cur, endDatum) <= 0) {
    ergebnis.push(isoString(cur));
    cur = cur.add({ days: 1 });
  }
  return ergebnis;
}

export function daysDiff(vonIso: IsoDate, bisIso: IsoDate): number {
  return Temporal.PlainDate.from(vonIso).until(bisIso).days;
}


// Ostern (Gaußsche Formel)


export function calcEaster(jahr: number): Temporal.PlainDate {
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
  return new Temporal.PlainDate(jahr, monat, tag);
}


// Buß- und Bettag (Mittwoch vor dem 23. November)


function calcBussUndBettag(jahr: number): Temporal.PlainDate {
  const nov23 = new Temporal.PlainDate(jahr, 11, 23);
  const dow = nov23.dayOfWeek; // 1=Mo … 7=So, 3=Mi
  const daysBack = dow >= 3 ? (dow - 3 || 7) : dow + 4;
  return nov23.subtract({ days: daysBack });
}


// Feiertage - alle 16 Bundesländer


export function getHolidays(jahr: number, region: string): Map<IsoDate, string> {
  const feiertage = new Map<IsoDate, string>();
  const add = (date: Temporal.PlainDate, name: string) => feiertage.set(isoString(date), name);
  const D = (m: number, t: number) => new Temporal.PlainDate(jahr, m, t);

  const ostern      = calcEaster(jahr);
  const karfreitag  = ostern.subtract({ days: 2 });
  const himmelfahrt = ostern.add({ days: 39 });
  const pfingstmontag = ostern.add({ days: 50 });
  const fronleichnam  = ostern.add({ days: 60 });

  // Bundesweit
  add(D(1,  1),  'Neujahr');
  add(karfreitag,    'Karfreitag');
  add(ostern,        'Ostersonntag');
  add(ostern.add({ days: 1 }), 'Ostermontag');
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
    add(ostern.add({ days: 49 }), 'Pfingstsonntag');
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


export function getFirmenregel(date: Temporal.PlainDate, firmenregeln: Firmenregel[]): Firmenregel | null {
  return firmenregeln.find(r => r.monat === date.month && r.tag === date.day) ?? null;
}


// Segment-Statistiken


export function calcSegment(segment: Segment, jahr: number, region: string, firmenregeln: Firmenregel[]): Segmentstats {
  // Segment auf das angezeigte Jahr beschränken
  const jahrStart = `${jahr}-01-01` as IsoDate;
  const jahrEnd   = `${jahr}-12-31` as IsoDate;
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
    const d = Temporal.PlainDate.from(iso);
    kalendertage++;

    if (d.dayOfWeek >= 6) { wochenendtage++; continue; }
    if (feiertage.has(iso)) { feiertageTage++; continue; }

    const regel = getFirmenregel(d, firmenregeln);
    if (regel) {
      halbeTage++;
      urlaubstage += Math.max(0, 1 - regel.freierAnteil); // freierAnteil=1→0 Tage, 0.5→0.5 Tage, 0→1 Tag
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


function calcSegmentPos(d: IsoDate, alleTage: IsoDate[], idx: number): 'anfang' | 'ende' | 'mitte' | 'solo' {
  const prev = addDays(d, -1);
  const next = addDays(d, 1);
  const isFirst = idx === 0 || alleTage[idx - 1] !== prev;
  const isLast  = idx === alleTage.length - 1 || alleTage[idx + 1] !== next;
  if (isFirst && isLast) return 'solo';
  if (isFirst) return 'anfang';
  if (isLast)  return 'ende';
  return 'mitte';
}

export function buildMonthDays(
  jahr: number,
  monat: number,       // 0-based
  szenario: Szenario,
  feiertage: Map<IsoDate, string>,
  firmenregeln: Firmenregel[],
): TagViewModel[] {
  const heute = isoString(Temporal.Now.plainDateISO());
  const anzahlTage = Temporal.PlainDate.from({ year: jahr, month: monat + 1, day: 1 })
    .toPlainYearMonth().daysInMonth;

  const segmentMap = new Map<IsoDate, { id: string; farbe: string; name: string; start: IsoDate; end: IsoDate; pos: 'anfang' | 'ende' | 'mitte' | 'solo' }>();
  for (const seg of szenario.segmente) {
    const alleTage = daysInRange(seg.start, seg.end);
    alleTage.forEach((d, idx) => {
      segmentMap.set(d, { id: seg.id, farbe: seg.farbe, name: seg.name, start: seg.start, end: seg.end, pos: calcSegmentPos(d, alleTage, idx) });
    });
  }

  const ergebnis: TagViewModel[] = [];
  for (let t = 1; t <= anzahlTage; t++) {
    const d   = new Temporal.PlainDate(jahr, monat + 1, t);
    const iso = isoString(d);
    const segData     = segmentMap.get(iso) ?? null;
    const firmenregel = getFirmenregel(d, firmenregeln);

    ergebnis.push({
      iso,
      tag: t,
      istWochenende: d.dayOfWeek >= 6,
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
  return {
    ...seg,
    start: addDays(seg.start, deltaTage),
    end: addDays(seg.end, deltaTage),
  };
}

export function hasOverlap(segmente: Segment[], start: IsoDate, end: IsoDate, ignoreId?: string): boolean {
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
    const d = new Temporal.PlainDate(jahr, r.monat, r.tag);
    if (d.dayOfWeek >= 6) continue;
    const iso = isoString(d);
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
