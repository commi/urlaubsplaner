import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AppState, Segment, Segmentstats, Szenario } from '../core/types';
import { calcSegment } from '../core/domain';
import { LOCALE } from '../core/constants';

@Component({
  selector: 'up-sidebar',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <!-- Szenarien -->
    <div class="d-print-none">
      <div class="section-label d-flex align-items-center justify-content-between text-body-secondary text-uppercase border-bottom">
        <span>Szenarien</span>
        <button class="icon-btn" title="Neues Szenario"
          (click)="szenarioAdd.emit('Szenario ' + (state.szenarien.length + 1))">
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>

      <div class="d-flex flex-column gap-1">
        @for (sz of state.szenarien; track sz.id) {
          <div class="szenario-item" [class.active]="sz.id === state.aktiveSzenarioId">
            <input
              class="szenario-name-input"
              [value]="sz.name"
              (focus)="szenarioSelect.emit(sz.id)"
              (change)="szenarioRename.emit({ id: sz.id, name: $any($event.target).value })"
              (keydown.enter)="$any($event.target).blur()">
            <div class="szenario-actions">
              <button class="icon-btn sm" title="Duplizieren"
                (mousedown)="$event.preventDefault()"
                (click)="szenarioDuplicate.emit(sz.id)">
                <i class="bi bi-copy"></i>
              </button>
              @if (state.szenarien.length > 1) {
                <button class="icon-btn sm danger" title="Löschen"
                  (mousedown)="$event.preventDefault()"
                  (click)="szenarioDelete.emit(sz.id)">
                  <i class="bi bi-trash"></i>
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Segmente -->
    <div class="section-label mt-2 d-flex align-items-center justify-content-between text-body-secondary text-uppercase border-bottom">
      <span>Urlaubssegmente</span>
      <span class="badge bg-secondary">{{ aktiveSzenario?.segmente?.length ?? 0 }}</span>
    </div>

    <div class="segment-list d-flex flex-column flex-fill overflow-y-auto">
      @if (!aktiveSzenario || aktiveSzenario.segmente.length === 0) {
        <div class="empty-hint text-body-secondary">
          <i class="bi bi-arrow-right-circle fs-4 d-block mb-1"></i>
          Zwei Tage im Kalender anklicken
        </div>
      }

      @for (seg of sortierteSzenarienSegmente; track seg.id) {
        <div class="seg-item" [style.--seg-farbe]="seg.farbe">
          <div class="seg-stripe"></div>
          <div class="seg-body flex-fill min-w-0">
            <div class="seg-name-row">
              <span class="seg-emoji" aria-hidden="true">{{ segEmoji(seg) }}</span>
              <input
                class="seg-name-input"
                [attr.data-seg-id]="seg.id"
                [value]="seg.name"
                (change)="onNameChange(seg.id, $event)"
                (keydown.enter)="$any($event.target).blur()">
            </div>
            <div class="seg-meta">
              <span class="font-monospace" style="font-size:.7rem">
                {{ formatSegDatum(seg.start) }} – {{ formatSegDatum(seg.end) }}
              </span>
              @if (getSegStats(seg); as stats) {
                <span class="seg-stat font-monospace text-primary">{{ stats.urlaubstage | number:'1.0-1' }} Tage</span>
              }
            </div>
            <div class="seg-extras d-print-none">
              <input type="color" class="seg-color-input"
                [value]="seg.farbe"
                (change)="segmentUpdate.emit({ id: seg.id, patch: { farbe: $any($event.target).value } })"
                title="Farbe ändern">
              <div class="seg-day-adjust">
                <button class="icon-btn sm" title="Tag weniger"
                  (mousedown)="$event.preventDefault()"
                  (click)="segmentUpdate.emit({ id: seg.id, patch: { end: adjustEnd(seg.end, -1) } })">
                  <i class="bi bi-dash"></i>
                </button>
                <button class="icon-btn sm" title="Tag mehr"
                  (mousedown)="$event.preventDefault()"
                  (click)="segmentUpdate.emit({ id: seg.id, patch: { end: adjustEnd(seg.end, 1) } })">
                  <i class="bi bi-plus"></i>
                </button>
              </div>
              <button class="icon-btn sm danger ms-auto"
                (mousedown)="$event.preventDefault()"
                (click)="segmentDelete.emit(seg.id)">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnChanges {
  @Input() state!: AppState;
  @Input() focusSegmentId: string | null = null;

  @Output() szenarioAdd       = new EventEmitter<string>();
  @Output() szenarioSelect    = new EventEmitter<string>();
  @Output() szenarioDuplicate = new EventEmitter<string>();
  @Output() szenarioDelete    = new EventEmitter<string>();
  @Output() szenarioRename    = new EventEmitter<{ id: string; name: string }>();
  @Output() segmentUpdate     = new EventEmitter<{ id: string; patch: Partial<Segment> }>();
  @Output() segmentDelete     = new EventEmitter<string>();

  private readonly hostEl = inject(ElementRef);
  private segStatsCache = new Map<string, Segmentstats>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state']) {
      this.segStatsCache.clear();
    }
    if (changes['focusSegmentId'] && this.focusSegmentId) {
      setTimeout(() => {
        const input = this.hostEl.nativeElement.querySelector(
          `[data-seg-id="${this.focusSegmentId}"]`
        ) as HTMLInputElement | null;
        input?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        input?.focus();
      });
    }
  }

  get aktiveSzenario(): Szenario | undefined {
    return this.state?.szenarien.find(s => s.id === this.state.aktiveSzenarioId);
  }

  get sortierteSzenarienSegmente(): Segment[] {
    const jahrStart = `${this.state.jahr}-01-01`;
    const jahrEnd   = `${this.state.jahr}-12-31`;
    return [...(this.aktiveSzenario?.segmente ?? [])]
      .filter(s => s.start <= jahrEnd && s.end >= jahrStart)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  getSegStats(seg: Segment): Segmentstats | null {
    if (!this.state) return null;
    if (!this.segStatsCache.has(seg.id)) {
      this.segStatsCache.set(seg.id, calcSegment(seg, this.state.jahr, this.state.region, this.state.firmenregeln ?? []));
    }
    return this.segStatsCache.get(seg.id) ?? null;
  }

  onNameChange(id: string, event: Event): void {
    const name = (event.target as HTMLInputElement).value.trim();
    if (name) this.segmentUpdate.emit({ id, patch: { name } });
  }

  adjustEnd(endIso: string, delta: number): string {
    return Temporal.PlainDate.from(endIso).add({ days: delta }).toString();
  }

  segEmoji(seg: Segment): string {
    const n = seg.name.toLowerCase();
    if (/\bski\b|snowboard|piste|wintersport/.test(n))                        return '⛷️';
    if (/weihnacht|advent|heiligabend/.test(n))                               return '🎄';
    if (/silvester|neujahr/.test(n))                                          return '🎆';
    if (/ostern|oster/.test(n))                                               return '🐣';
    if (/pfingsten/.test(n))                                                  return '🌸';
    if (/strand|\bmeer\b|küste|ibiza|mallorca|hawaii|karibik|mediterran/.test(n)) return '🏖️';
    if (/\bberg\b|wandern|alpen|hütte|trekking|hiking/.test(n))               return '🏔️';
    if (/camping|\bzelt\b/.test(n))                                           return '⛺';
    if (/kreuzfahrt|cruise/.test(n))                                          return '🚢';
    if (/\bstadt\b|city|paris|\brom\b|london|berlin|amsterdam/.test(n))       return '🏛️';
    if (/hochzeit|heirat|wedding/.test(n))                                    return '💒';
    if (/geburtstag|birthday/.test(n))                                        return '🎂';
    if (/familie|familien|family/.test(n))                                    return '👨‍👩‍👧';
    if (/erhol|wellness|\bspa\b|\bkur\b/.test(n))                             return '🧘';
    const m = new Date(seg.start + 'T00:00:00').getMonth() + 1;
    if (m === 12 || m <= 2) return '❄️';
    if (m <= 4)             return '🌸';
    if (m <= 6)             return '🌿';
    if (m <= 8)             return '☀️';
    if (m <= 10)            return '🍂';
    return '🌧️';
  }

  formatSegDatum(iso: string): string {
    const jahr = parseInt(iso.substring(0, 4), 10);
    const mitJahr = this.state && jahr !== this.state.jahr;
    return new Intl.DateTimeFormat(LOCALE, {
      day: '2-digit', month: '2-digit', ...(mitJahr ? { year: 'numeric' } : {}),
    }).format(new Date(iso + 'T00:00:00'));
  }
}
