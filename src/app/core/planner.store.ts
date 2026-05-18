import { Injectable } from '@angular/core';
import { AppState, Firmenregel, IsoDate, Segment, Szenario, Gesamtstatistik } from './types';
import { calcTotals, addDays, nextColor, hasOverlap } from './domain';
import { FIRMENREGELN } from './constants';

const STORAGE_KEY = 'urlaubsplaner_v1';

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function defaultState(): AppState {
  const szenarioId = genId();
  return {
    jahr: Temporal.Now.plainDateISO().year,
    region: 'DE-NW',
    kontingent: 30,
    aktiveSzenarioId: szenarioId,
    szenarien: [
      { id: szenarioId, name: 'Szenario 1', segmente: [] },
    ],
    firmenregeln: FIRMENREGELN,
  };
}

@Injectable({ providedIn: 'root' })
export class PlannerStore {
  state: AppState = this.loadState();

  get aktiveSzenario(): Szenario {
    return this.state.szenarien.find(s => s.id === this.state.aktiveSzenarioId)
      ?? this.state.szenarien[0];
  }

  get totals(): Gesamtstatistik {
    return calcTotals(this.aktiveSzenario, this.state.jahr, this.state.region, this.state.kontingent, this.state.firmenregeln);
  }

  
  // Einstellungen
  

  updateArbeitsvertrag(patch: Partial<Pick<AppState, 'kontingent' | 'region' | 'jahr'>>): void {
    this.state = { ...this.state, ...patch };
    this.saveState();
  }

  
  // Szenarien
  

  addSzenario(name: string): void {
    const id = genId();
    this.state = {
      ...this.state,
      szenarien: [...this.state.szenarien, { id, name, segmente: [] }],
      aktiveSzenarioId: id,
    };
    this.saveState();
  }

  duplicateSzenario(id: string): void {
    const quelle = this.state.szenarien.find(s => s.id === id);
    if (!quelle) return;
    const neueId = genId();
    const kopie: Szenario = {
      id: neueId,
      name: `${quelle.name} (Kopie)`,
      segmente: quelle.segmente.map(s => ({ ...s, id: genId() })),
    };
    this.state = {
      ...this.state,
      szenarien: [...this.state.szenarien, kopie],
      aktiveSzenarioId: neueId,
    };
    this.saveState();
  }

  deleteSzenario(id: string): void {
    if (this.state.szenarien.length <= 1) return;
    const szenarien = this.state.szenarien.filter(s => s.id !== id);
    const aktiveSzenarioId = this.state.aktiveSzenarioId === id
      ? szenarien[0].id
      : this.state.aktiveSzenarioId;
    this.state = { ...this.state, szenarien, aktiveSzenarioId };
    this.saveState();
  }

  renameSzenario(id: string, name: string): void {
    this.state = {
      ...this.state,
      szenarien: this.state.szenarien.map(s => s.id === id ? { ...s, name } : s),
    };
    this.saveState();
  }

  setAktiveSzenario(id: string): void {
    this.state = { ...this.state, aktiveSzenarioId: id };
    this.saveState();
  }

  
  // Segmente
  

  addSegment(s: Omit<Segment, 'id'>): void {
    if (hasOverlap(this.aktiveSzenario.segmente, s.start, s.end)) return;
    const neuesSegment: Segment = { ...s, id: genId() };
    this.updateAktiveSzenario(sz => ({
      ...sz,
      segmente: [...sz.segmente, neuesSegment],
    }));
  }

  updateSegment(id: string, patch: Partial<Segment>): void {
    const current = this.aktiveSzenario.segmente.find(s => s.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    if (hasOverlap(this.aktiveSzenario.segmente, updated.start, updated.end, id)) return;
    this.updateAktiveSzenario(sz => ({
      ...sz,
      segmente: sz.segmente.map(s => s.id === id ? { ...s, ...patch } : s),
    }));
  }

  deleteSegment(id: string): void {
    this.updateAktiveSzenario(sz => ({
      ...sz,
      segmente: sz.segmente.filter(s => s.id !== id),
    }));
  }

  splitSegment(id: string, anDatum: IsoDate): void {
    const seg = this.aktiveSzenario.segmente.find(s => s.id === id);
    if (!seg || anDatum <= seg.start || anDatum > seg.end) return;

    const endeErster = addDays(anDatum, -1);

    const erster: Segment  = { ...seg, end: endeErster };
    const zweiter: Segment = { ...seg, id: genId(), start: anDatum };

    this.updateAktiveSzenario(sz => ({
      ...sz,
      segmente: sz.segmente.flatMap(s => s.id === id ? [erster, zweiter] : [s]),
    }));
  }

  mergeSegments(id1: string, id2: string): void {
    const segs = this.aktiveSzenario.segmente;
    const a = segs.find(s => s.id === id1);
    const b = segs.find(s => s.id === id2);
    if (!a || !b) return;

    const start = a.start < b.start ? a.start : b.start;
    const end   = a.end   > b.end   ? a.end   : b.end;
    const merged: Segment = { ...a, start, end };

    this.updateAktiveSzenario(sz => ({
      ...sz,
      segmente: sz.segmente.filter(s => s.id !== id1 && s.id !== id2).concat(merged),
    }));
  }

  clearSzenario(): void {
    this.updateAktiveSzenario(sz => ({ ...sz, segmente: [] }));
  }

  
  // Import / Export
  

  exportJson(): void {
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `urlaubsplaner-${this.state.jahr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJson(file: File): Promise<void> {
    return file.text().then(text => {
      const parsed = JSON.parse(text) as AppState;
      this.state = parsed;
      this.saveState();
    });
  }

  
  // Persistenz
  

  saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // localStorage nicht verfügbar
    }
  }

  loadState(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        // Migration: ältere Saves ohne firmenregeln
        if (!parsed.firmenregeln) parsed.firmenregeln = FIRMENREGELN;
        return parsed;
      }
    } catch {
      // ignore
    }
    return defaultState();
  }

  
  // Hilfsfunktion
  

  private updateAktiveSzenario(fn: (sz: Szenario) => Szenario): void {
    this.state = {
      ...this.state,
      szenarien: this.state.szenarien.map(s =>
        s.id === this.state.aktiveSzenarioId ? fn(s) : s
      ),
    };
    this.saveState();
  }

  
  // Firmenregeln
  

  addFirmenregel(): void {
    const id = genId();
    const neu: Firmenregel = { id, monat: 1, tag: 1, freierAnteil: 1, pflichturlaub: false, bezeichnung: 'Neuer Sondertag' };
    this.state = { ...this.state, firmenregeln: [...this.state.firmenregeln, neu] };
    this.saveState();
  }

  updateFirmenregel(id: string, patch: Partial<Firmenregel>): void {
    this.state = {
      ...this.state,
      firmenregeln: this.state.firmenregeln.map(r => r.id === id ? { ...r, ...patch } : r),
    };
    this.saveState();
  }

  deleteFirmenregel(id: string): void {
    this.state = { ...this.state, firmenregeln: this.state.firmenregeln.filter(r => r.id !== id) };
    this.saveState();
  }

  nextFarbe(): string {
    const genutztefarben = this.aktiveSzenario.segmente.map(s => s.farbe);
    return nextColor(genutztefarben);
  }
}
