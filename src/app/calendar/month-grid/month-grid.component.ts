import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';
import { TagViewModel } from '../../core/types';
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
          [attr.title]="day.feiertagName ?? day.firmenregel?.bezeichnung ?? day.segment?.name ?? null"
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

  @Output() dayClick           = new EventEmitter<string>();
  @Output() segmentPointerDown = new EventEmitter<{ event: PointerEvent; id: string }>();

  readonly weekdayLabels = WOCHENTAG_LABELS;

  get monthName(): string {
    return MONAT_LABELS[this.monat] + ' ' + this.jahr;
  }

  get firstDayOffset(): number {
    if (!this.days?.length) return 0;
    const ersterTag = new Date(this.days[0].iso + 'T00:00:00');
    // Montag = 0, Sonntag = 6
    return (ersterTag.getDay() + 6) % 7;
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
