import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatDatePipe } from '../../shared/pipes';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import type { Formation as FormationItem } from '../../core/models';

@Component({
  selector: 'pp-formation',
  imports: [TranslatePipe, FormatDatePipe],
  templateUrl: './formation.html',
})
export class Formation implements OnInit {
  readonly #facade = inject(PortfolioFacade);
  readonly items = signal<FormationItem[]>([]);

  ngOnInit(): void {
    this.#facade.getFormation().subscribe((f) => this.items.set(f));
  }

  formatDate(d: string): string {
    const [y, m] = d.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  }
}
