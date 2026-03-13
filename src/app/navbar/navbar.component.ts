import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppState } from '../core/types';
import { REGIONEN } from '../core/constants';

@Component({
  selector: 'up-navbar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="brand d-flex align-items-center gap-2">
      <i class="bi bi-sun-fill text-warning"></i>
      <span>Urlaubsplaner</span>
    </div>

    <div class="d-flex align-items-center gap-3 ms-auto">
      <div class="d-flex align-items-center gap-2">
        <label class="form-label mb-0 small text-secondary" for="kontingent">Urlaubstage</label>
        <input
          id="kontingent"
          class="form-control form-control-sm"
          style="width: 70px"
          type="number"
          min="1"
          max="60"
          [ngModel]="formWert.kontingent"
          (ngModelChange)="onKontingentChange($event)">
      </div>

      <div class="d-flex align-items-center gap-2">
        <label class="form-label mb-0 small text-secondary" for="jahr">Jahr</label>
        <input
          id="jahr"
          class="form-control form-control-sm"
          style="width: 78px"
          type="number"
          min="2020"
          max="2035"
          [ngModel]="formWert.jahr"
          (ngModelChange)="onJahrChange($event)">
      </div>

      <div class="d-flex align-items-center gap-2">
        <label class="form-label mb-0 small text-secondary" for="region">Bundesland</label>
        <select
          id="region"
          class="form-select form-select-sm"
          style="width: 180px"
          [ngModel]="formWert.region"
          (ngModelChange)="onRegionChange($event)">
          @for (r of regionen; track r.value) {
            <option [value]="r.value">{{ r.label }}</option>
          }
        </select>
      </div>
    </div>
  `,
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  @Input() state!: AppState;
  @Output() arbeitsvertragChange = new EventEmitter<Partial<Pick<AppState, 'kontingent' | 'region' | 'jahr'>>>();

  readonly regionen = REGIONEN;

  formWert = { kontingent: 30, region: 'DE-NW', jahr: new Date().getFullYear() };

  ngOnInit(): void {
    this.formWert = {
      kontingent: this.state.kontingent,
      region:     this.state.region,
      jahr:       this.state.jahr,
    };
  }

  onKontingentChange(val: number): void {
    this.formWert = { ...this.formWert, kontingent: val };
    this.arbeitsvertragChange.emit({ kontingent: Number(val) });
  }

  onJahrChange(val: number): void {
    this.formWert = { ...this.formWert, jahr: val };
    this.arbeitsvertragChange.emit({ jahr: Number(val) });
  }

  onRegionChange(val: string): void {
    this.formWert = { ...this.formWert, region: val };
    this.arbeitsvertragChange.emit({ region: val });
  }
}
