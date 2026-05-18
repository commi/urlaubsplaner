import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AppState, Firmenregel, Gesamtstatistik } from '../core/types';
import { getHolidays, uncoveredPflichtTage } from '../core/domain';
import { LOCALE, MONAT_LABELS } from '../core/constants';

@Component({
  selector: 'up-panel',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  template: `
    <div class="panel-title">Übersicht</div>

    <!-- Gesamtstatistik -->
    @if (totals) {
      <div class="stat-grid">
        <div class="bg-body-secondary border rounded-2 p-2">
          <div class="stat-val" [class.text-danger]="totals.urlaubstage > state.kontingent">
            {{ totals.urlaubstage | number:'1.0-1' }}
          </div>
          <div class="stat-label text-secondary">Urlaubstage</div>
        </div>
        <div class="bg-body-secondary border rounded-2 p-2">
          <div class="stat-val" [class.text-success]="totals.resturlaub >= 0" [class.text-danger]="totals.resturlaub < 0">
            {{ totals.resturlaub | number:'1.0-1' }}
          </div>
          <div class="stat-label text-secondary">Resturlaub</div>
        </div>
        <div class="bg-body-secondary border rounded-2 p-2">
          <div class="stat-val text-secondary">{{ totals.feiertage }}</div>
          <div class="stat-label text-secondary">Feiertage genutzt</div>
        </div>
        <div class="bg-body-secondary border rounded-2 p-2">
          <div class="stat-val text-secondary">{{ totals.wochenendtage }}</div>
          <div class="stat-label text-secondary">Wochenendtage</div>
        </div>
      </div>

      <div class="mb-1 d-print-none">
        <div class="d-flex justify-content-between small text-secondary mb-1">
          <span>Kontingent</span>
          <span class="font-monospace">{{ totals.urlaubstage | number:'1.0-1' }} / {{ state.kontingent }}</span>
        </div>
        <div class="progress" style="height: 5px; background: var(--up-surface-3);">
          <div
            class="progress-bar"
            [class.bg-success]="totals.urlaubstage <= state.kontingent"
            [class.bg-danger]="totals.urlaubstage > state.kontingent"
            [style.width.%]="progressProzent">
          </div>
        </div>
      </div>
    }

    <!-- Firmenregeln -->
    <div class="panel-subtitle d-flex d-print-none align-items-center justify-content-between">
      <span>Sondertage</span>
      <button class="icon-btn sm" title="Sondertag hinzufügen" (click)="firmenregelAdd.emit()">
        <i class="bi bi-plus-lg"></i>
      </button>
    </div>

    <div class="d-flex d-print-none flex-column gap-1">
      @for (r of state.firmenregeln; track r.id) {
        <div class="regel-item" [class.uncovered]="nichtAbgedeckt.has(r.id)">

          <!-- Zeile 1: Bezeichnung + Warnung + Löschen -->
          <div class="d-flex align-items-center gap-1">
            <input
              class="regel-bez-input flex-fill"
              [value]="r.bezeichnung"
              (change)="firmenregelUpdate.emit({ id: r.id, patch: { bezeichnung: $any($event.target).value } })"
              (keydown.enter)="$any($event.target).blur()">
            @if (nichtAbgedeckt.has(r.id)) {
              <i class="bi bi-exclamation-triangle-fill text-warning flex-shrink-0" style="font-size:.75rem"
                title="Pflichturlaub nicht durch Segment abgedeckt"></i>
            }
            <button class="icon-btn sm danger flex-shrink-0" (click)="firmenregelDelete.emit(r.id)">
              <i class="bi bi-trash"></i>
            </button>
          </div>

          <!-- Zeile 2: Datum + Anteil + Pflicht-Switch -->
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <select class="form-select form-select-sm" style="width:108px"
              [ngModel]="r.monat"
              (ngModelChange)="firmenregelUpdate.emit({ id: r.id, patch: { monat: +$event } })">
              @for (m of monatOptionen; track m.value) {
                <option [value]="m.value">{{ m.label }}</option>
              }
            </select>

            <input type="number" class="form-control form-control-sm" style="width:56px"
              min="1" max="31" [value]="r.tag"
              (change)="firmenregelUpdate.emit({ id: r.id, patch: { tag: +$any($event.target).value } })">

            <div class="btn-group btn-group-sm" role="group">
              <input type="radio" class="btn-check" autocomplete="off"
                [name]="'fa-' + r.id" [id]="'fa1-' + r.id" [value]="1"
                [ngModel]="r.freierAnteil"
                (ngModelChange)="firmenregelUpdate.emit({ id: r.id, patch: { freierAnteil: 1 } })"
                title="Ganzer Tag frei - kein Urlaubstag nötig">
              <label class="btn btn-outline-secondary" [for]="'fa1-' + r.id"
                title="Ganzer Tag frei - kein Urlaubstag nötig">Frei</label>

              <input type="radio" class="btn-check" autocomplete="off"
                [name]="'fa-' + r.id" [id]="'fa05-' + r.id" [value]="0.5"
                [ngModel]="r.freierAnteil"
                (ngModelChange)="firmenregelUpdate.emit({ id: r.id, patch: { freierAnteil: 0.5 } })"
                title="Halber Tag frei - ½ Urlaubstag nötig wenn Pflicht">
              <label class="btn btn-outline-secondary" [for]="'fa05-' + r.id"
                title="Halber Tag frei - ½ Urlaubstag nötig wenn Pflicht">½ Tag</label>

              <input type="radio" class="btn-check" autocomplete="off"
                [name]="'fa-' + r.id" [id]="'fa0-' + r.id" [value]="0"
                [ngModel]="r.freierAnteil"
                (ngModelChange)="firmenregelUpdate.emit({ id: r.id, patch: { freierAnteil: 0 } })"
                title="Kein freier Anteil - voller Urlaubstag nötig wenn Pflicht">
              <label class="btn btn-outline-secondary" [for]="'fa0-' + r.id"
                title="Kein freier Anteil - voller Urlaubstag nötig wenn Pflicht">1 Tag</label>
            </div>

            <div class="form-check form-switch mb-0" title="Pflichturlaub, Urlaubstage werden abgezogen wenn nötig">
              <input class="form-check-input" type="checkbox" role="switch"
                [id]="'pflicht-' + r.id"
                [checked]="r.pflichturlaub"
                (change)="firmenregelUpdate.emit({ id: r.id, patch: { pflichturlaub: $any($event.target).checked } })">
              <label class="form-check-label small text-secondary" [for]="'pflicht-' + r.id">Pflicht</label>
            </div>
          </div>

        </div>
      } @empty {
        <div class="small text-secondary" style="padding: .25rem .35rem">Keine Sondertage definiert</div>
      }
    </div>

    <!-- Feiertage  -->
    <div class="feiertage-section">
      <div class="panel-subtitle">Feiertage {{ state?.jahr }}</div>
      <table class="feiertage-list">
        <tbody>
          @for (ft of feiertageListe; track ft.iso) {
            <tr>
              <td class="font-monospace text-warning">{{ formatDatumKurz(ft.iso) }}</td>
              <td class="text-truncate">{{ ft.name }}</td>
            </tr>
          } @empty {
            <tr><td colspan="2" class="small text-secondary p-2">Keine Feiertage gefunden</td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Aktionen -->
    <div class="actions d-print-none">
      <button class="action-btn" (click)="export.emit()">
        <i class="bi bi-download"></i> Exportieren
      </button>
      <label class="action-btn import-label">
        <i class="bi bi-upload"></i> Importieren
        <input type="file" accept=".json" (change)="onImport($event)" hidden>
      </label>
      @if (!confirmingClear) {
        <button class="action-btn danger" (click)="confirmingClear = true">
          <i class="bi bi-trash"></i> Szenario leeren
        </button>
      } @else {
        <div class="d-flex align-items-center gap-2">
          <span class="small text-secondary flex-fill">Wirklich leeren?</span>
          <button class="btn btn-sm btn-outline-secondary" (click)="confirmingClear = false">Nein</button>
          <button class="btn btn-sm btn-danger" (click)="doClear()">Ja</button>
        </div>
      }
    </div>
  `,
  styleUrl: './panel.component.scss',
})
export class PanelComponent implements OnChanges {
  @Input() state!: AppState;
  @Input() totals!: Gesamtstatistik;

  @Output() export             = new EventEmitter<void>();
  @Output() import             = new EventEmitter<File>();
  @Output() clear              = new EventEmitter<void>();
  @Output() firmenregelAdd     = new EventEmitter<void>();
  @Output() firmenregelUpdate  = new EventEmitter<{ id: string; patch: Partial<Firmenregel> }>();
  @Output() firmenregelDelete  = new EventEmitter<string>();

  feiertageListe: { iso: string; name: string }[] = [];
  nichtAbgedeckt = new Set<string>();
  confirmingClear = false;

  readonly monatOptionen = MONAT_LABELS.map((label, i) => ({
    value: i + 1,
    label,
    kurzLabel: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(new Temporal.PlainDate(2024, i + 1, 1)).replace('.', ''),
  }));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state'] && this.state) {
      this.updateFeiertage();
    }
  }

  private updateFeiertage(): void {
    const map = getHolidays(this.state.jahr, this.state.region);
    this.feiertageListe = Array.from(map.entries())
      .map(([iso, name]) => ({ iso, name }))
      .sort((a, b) => a.iso.localeCompare(b.iso));

    const aktiveSzenario = this.state.szenarien.find(s => s.id === this.state.aktiveSzenarioId)
      ?? this.state.szenarien[0];
    this.nichtAbgedeckt = uncoveredPflichtTage(this.state.firmenregeln ?? [], aktiveSzenario, this.state.jahr);
  }

  get progressProzent(): number {
    if (!this.totals || !this.state?.kontingent) return 0;
    return Math.min(100, (this.totals.urlaubstage / this.state.kontingent) * 100);
  }

  formatRegelDatum(r: Firmenregel): string {
    return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' }).format(
      new Temporal.PlainDate(2024, r.monat, r.tag)
    );
  }

  formatDatumKurz(iso: string): string {
    return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit' }).format(
      Temporal.PlainDate.from(iso)
    );
  }

  onImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.import.emit(file);
    input.value = '';
  }

  doClear(): void {
    this.clear.emit();
    this.confirmingClear = false;
  }
}
