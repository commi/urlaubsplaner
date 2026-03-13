export interface Segment {
  id: string;
  name: string;
  start: string;   // yyyy-mm-dd
  end: string;     // yyyy-mm-dd
  farbe: string;   // hex
}

export interface Szenario {
  id: string;
  name: string;
  segmente: Segment[];
}

export interface AppState {
  jahr: number;
  region: string;
  kontingent: number;
  aktiveSzenarioId: string;
  szenarien: Szenario[];
  firmenregeln: Firmenregel[];
}

export interface Segmentstats {
  kalendertage: number;
  wochenendtage: number;
  feiertage: number;
  halbeTage: number;
  urlaubstage: number;   // das was gegen Budget zählt
}

export interface Gesamtstatistik {
  urlaubstage: number;
  segmente: number;
  feiertage: number;
  wochenendtage: number;
  resturlaub: number;
}

export interface TagViewModel {
  iso: string;
  tag: number;
  istWochenende: boolean;
  istHeute: boolean;
  feiertagName: string | null;
  firmenregel: Firmenregel | null;
  istPflichturlaub: boolean;
  segment: { id: string; farbe: string; name: string; start: string; end: string } | null;
  segmentPos: 'anfang' | 'ende' | 'mitte' | 'solo' | null;
  istAuswahl: boolean;
  auswahlPos: 'anfang' | 'ende' | 'mitte' | 'solo' | null;
  istVerschiebevorschau: boolean;
}

export interface Firmenregel {
  id: string;
  monat: number;
  tag: number;
  freierAnteil: number;   // 0.5 = halber Tag, 1.0 = ganzer Tag
  pflichturlaub: boolean;
  bezeichnung: string;
}
