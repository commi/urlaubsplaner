import {
  Component, Input, Output, EventEmitter, OnDestroy,
} from '@angular/core';
import { AppState, Segment, Szenario, TagViewModel } from '../core/types';
import {
  buildMonthDays, daysDiff, getHolidays,
  hasOverlap, isoDate, parseIso, shiftSegment,
} from '../core/domain';
import { MonthGridComponent } from './month-grid/month-grid.component';
import { LOCALE } from '../core/constants';

@Component({
  selector: 'up-calendar',
  standalone: true,
  imports: [MonthGridComponent],
  template: `
    @if (auswahlStart) {
      <div class="selection-hint">
        <i class="bi bi-cursor"></i>
        ab {{ formatDatum(auswahlStart) }} - Endtag wählen
        <button class="icon-btn sm ms-1" (click)="auswahlAbbrechen()">
          <i class="bi bi-x"></i>
        </button>
      </div>
    }

    <div class="monate-grid">
      @for (m of monate; track m) {
        <up-month-grid
          [monat]="m"
          [jahr]="state.jahr"
          [days]="getMonthDays(m)"
          (dayClick)="onDayClick($event)"
          (segmentPointerDown)="onSegmentPointerDown($event.event, $event.id)">
        </up-month-grid>
      }
    </div>
  `,
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent implements OnDestroy {
  @Input() state!: AppState;

  @Output() segmentPending  = new EventEmitter<{ start: string; end: string }>();
  @Output() segmentMove     = new EventEmitter<{ id: string; start: string; end: string }>();
  @Output() segmentFocus    = new EventEmitter<string>();

  readonly monate = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // View-State
  auswahlStart: string | null = null;

  dragState: {
    segmentId: string;
    originalStart: string;
    originalEnd: string;
    startIso: string;
  } | null = null;

  ngOnDestroy(): void {
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  }

  get aktiveSzenario(): Szenario {
    return this.state?.szenarien.find(s => s.id === this.state.aktiveSzenarioId)
      ?? this.state?.szenarien[0];
  }

  getMonthDays(monat: number): TagViewModel[] {
    if (!this.state) return [];
    const feiertage = getHolidays(this.state.jahr, this.state.region);
    const tage = buildMonthDays(this.state.jahr, monat, this.aktiveSzenario, feiertage, this.state.firmenregeln);

    if (this.auswahlStart) {
      tage.forEach(tag => {
        tag.istAuswahl = tag.iso === this.auswahlStart;
        tag.auswahlPos = tag.istAuswahl ? 'solo' : null;
      });
    }

    return tage;
  }

  // Zwei-Klick-Selektion 

  onDayClick(iso: string): void {
    if (this.dragState) return;

    // Belegter Tag → Selektion nicht möglich, Segment fokussieren
    const belegtesSeg = this.aktiveSzenario.segmente.find(s => s.start <= iso && s.end >= iso);
    if (belegtesSeg) {
      this.auswahlStart = null;
      this.segmentFocus.emit(belegtesSeg.id);
      return;
    }

    if (!this.auswahlStart) {
      this.auswahlStart = iso;
    } else {
      const start = this.auswahlStart < iso ? this.auswahlStart : iso;
      const end   = this.auswahlStart < iso ? iso : this.auswahlStart;
      this.auswahlStart = null;
      if (!hasOverlap(this.aktiveSzenario.segmente, start, end)) {
        this.segmentPending.emit({ start, end });
      }
    }
  }

  auswahlAbbrechen(): void {
    this.auswahlStart = null;
  }

  // Drag & Drop 

  onSegmentPointerDown(event: PointerEvent, segmentId: string): void {
    event.preventDefault();
    const iso = this.isoFromPointerEvent(event);
    if (!iso) return;

    const seg = this.aktiveSzenario.segmente.find(s => s.id === segmentId);
    if (!seg) return;

    this.dragState = {
      segmentId,
      originalStart: seg.start,
      originalEnd:   seg.end,
      startIso: iso,
    };

    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp, { once: true } as any);
  }

  onPointerMove = (event: PointerEvent): void => {
    if (!this.dragState) return;
    const currentIso = this.isoFromPointerEvent(event);
    if (!currentIso) return;

    const delta = daysDiff(this.dragState.startIso, currentIso);
    if (delta === 0) return;

    const verschoben = shiftSegment(
      { id: this.dragState.segmentId, name: '', farbe: '', start: this.dragState.originalStart, end: this.dragState.originalEnd },
      delta,
    );
    this.segmentMove.emit({ id: this.dragState.segmentId, start: verschoben.start, end: verschoben.end });
  };

  onPointerUp = (): void => {
    document.removeEventListener('pointermove', this.onPointerMove);
    this.dragState = null;
  };

  private isoFromPointerEvent(event: PointerEvent): string | null {
    const el = document.elementFromPoint(event.clientX, event.clientY);
    return el?.closest('[data-iso]')?.getAttribute('data-iso') ?? null;
  }

  formatDatum(iso: string): string {
    return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit' }).format(
      new Date(iso + 'T00:00:00')
    );
  }
}
