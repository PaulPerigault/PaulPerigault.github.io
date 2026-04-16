import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import type { Experience as ExperienceItem } from '../../core/models';

@Component({
  selector: 'pp-experience',
  imports: [TranslatePipe],
  templateUrl: './experience.html',
})
export class Experience implements OnInit {
  readonly #facade = inject(PortfolioFacade);
  readonly items = signal<ExperienceItem[]>([]);

  ngOnInit(): void {
    this.#facade.getExperience().subscribe((e) => this.items.set(e));
  }

  formatDate(d: string): string {
    const [y, m] = d.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  }
}
