import { Component, inject } from '@angular/core';
import { PlannerStore } from './core/planner.store';
import { NavbarComponent } from './navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { CalendarComponent } from './calendar/calendar.component';
import { PanelComponent } from './panel/panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, SidebarComponent, CalendarComponent, PanelComponent],
  template: `
    <up-navbar class="d-print-none"
      [state]="store.state"
      (arbeitsvertragChange)="store.updateArbeitsvertrag($event)">
    </up-navbar>

    <up-calendar
      [state]="store.state"
      (segmentPending)="onSegmentPending($event)"
      (segmentFocus)="onSegmentFocus($event)"
      (segmentMove)="store.updateSegment($event.id, { start: $event.start, end: $event.end })">
    </up-calendar>

    <up-sidebar
      [state]="store.state"
      [focusSegmentId]="focusSegmentId"
      (szenarioAdd)="store.addSzenario($event)"
      (szenarioSelect)="store.setAktiveSzenario($event)"
      (szenarioDuplicate)="store.duplicateSzenario($event)"
      (szenarioDelete)="store.deleteSzenario($event)"
      (szenarioRename)="store.renameSzenario($event.id, $event.name)"
      (segmentUpdate)="store.updateSegment($event.id, $event.patch)"
      (segmentDelete)="store.deleteSegment($event)">
    </up-sidebar>

    <up-panel
      [state]="store.state"
      [totals]="store.totals"
      (export)="store.exportJson()"
      (import)="store.importJson($event)"
      (clear)="store.clearSzenario()"
      (firmenregelAdd)="store.addFirmenregel()"
      (firmenregelUpdate)="store.updateFirmenregel($event.id, $event.patch)"
      (firmenregelDelete)="store.deleteFirmenregel($event)">
    </up-panel>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly store = inject(PlannerStore);

  focusSegmentId: string | null = null;

  onSegmentFocus(id: string): void {
    this.focusSegmentId = id;
    // Reset nach kurzer Zeit damit derselbe Klick erneut triggern kann
    setTimeout(() => this.focusSegmentId = null, 150);
  }

  onSegmentPending(data: { start: string; end: string }): void {
    const n = this.store.aktiveSzenario.segmente.length + 1;
    this.store.addSegment({
      start: data.start,
      end:   data.end,
      name:  `Urlaub ${n}`,
      farbe: this.store.nextFarbe(),
    });
  }
}
