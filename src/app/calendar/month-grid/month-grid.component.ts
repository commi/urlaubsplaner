import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';
import { IsoDate, TagViewModel } from '../../core/types';
import { WOCHENTAG_LABELS, MONAT_LABELS } from '../../core/constants';

@Component({
  selector: 'up-month-grid',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="month-title border-bottom">{{ monthName }}</div>
    <div class="weekdays">
      @for (wd of weekdayLabels; track wd) {
        <span>{{ wd }}</span>
      }
    </div>
    <div class="days-grid" [style.--offset]="firstDayOffset">
      @for (day of days; track day.iso) {
        <div
          class="day"
          [ngClass]="dayClasses(day)"
          [style.--seg-color]="day.segment?.farbe ?? 'transparent'"
          [attr.data-iso]="day.iso"
          [attr.title]="buildTooltip(day)"
          (click)="dayClick.emit(day.iso)"
          (pointerdown)="day.segment ? segmentPointerDown.emit({ event: $event, id: day.segment.id }) : null">
          <span class="tag-zahl">{{ day.tag }}</span>
          @if (day.feiertagName) {
            <span class="feiertag-dot"></span>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './month-grid.component.scss',
})
export class MonthGridComponent {
  @Input() monat!: number;   // 0-based
  @Input() jahr!: number;
  @Input() days!: TagViewModel[];

  @Output() dayClick           = new EventEmitter<IsoDate>();
  @Output() segmentPointerDown = new EventEmitter<{ event: PointerEvent; id: string }>();

  readonly weekdayLabels = WOCHENTAG_LABELS;

  get monthName(): string {
    return MONAT_LABELS[this.monat] + ' ' + this.jahr;
  }

  get firstDayOffset(): number {
    if (!this.days?.length) return 0;
    // Temporal dayOfWeek: Mo=1 … Su=7 → subtract 1 for Mo=0 … Su=6
    return Temporal.PlainDate.from(this.days[0].iso).dayOfWeek - 1;
  }

  buildTooltip(day: TagViewModel): string | null {
    const zeilen: string[] = [];
    const fmt = (iso: string) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(Temporal.PlainDate.from(iso));
    const tageZwischen = (a: string, b: string) => Temporal.PlainDate.from(a).until(b).days + 1;

    if (day.istHeute) zeilen.push('Heute');

    if (day.feiertagName) {
      const hinweis = day.istWochenende ? ' (fällt auf Wochenende, zählt nicht)' : '';
      zeilen.push(`Feiertag: ${day.feiertagName}${hinweis}`);
    }

    if (day.firmenregel && !day.istWochenende && !day.feiertagName) {
      const details: string[] = [];
      if (day.firmenregel.freierAnteil < 1) details.push('halber Urlaubstag');
      if (day.firmenregel.pflichturlaub)    details.push('Pflichturlaub');
      const suffix = details.length ? ` (${details.join(', ')})` : '';
      zeilen.push(`Sondertag: ${day.firmenregel.bezeichnung}${suffix}`);
    }

    if (day.segment) {
      const anzahlTage = tageZwischen(day.segment.start, day.segment.end);
      zeilen.push(`Urlaub: ${day.segment.name}`);
      zeilen.push(`${fmt(day.segment.start)} – ${fmt(day.segment.end)} (${anzahlTage} Kalendertage)`);
    }

    if (day.istWochenende && !day.feiertagName && !day.segment) return null;

    return zeilen.length ? zeilen.join('\n') : null;
  }

  dayClasses(day: TagViewModel): Record<string, boolean> {
    return {
      'wochenende':       day.istWochenende,
      'heute':            day.istHeute,
      'feiertag':         !!day.feiertagName,
      'sondertag':        !!day.firmenregel && !day.istWochenende && !day.feiertagName,
      'pflicht':          day.istPflichturlaub,
      'urlaub':           !!day.segment,
      'urlaub-anfang':    day.segmentPos === 'anfang',
      'urlaub-ende':      day.segmentPos === 'ende',
      'urlaub-mitte':     day.segmentPos === 'mitte',
      'urlaub-solo':      day.segmentPos === 'solo',
      'auswahl':          day.istAuswahl,
      'auswahl-anfang':   day.auswahlPos === 'anfang',
      'auswahl-ende':     day.auswahlPos === 'ende',
      'auswahl-mitte':    day.auswahlPos === 'mitte',
      'auswahl-solo':     day.auswahlPos === 'solo',
      'verschiebevorschau': day.istVerschiebevorschau,
    };
  }
}
