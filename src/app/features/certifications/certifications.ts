import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatDatePipe } from '../../shared/pipes';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import { Certification } from '../../core/models';

@Component({
  selector: 'pp-certifications',
  imports: [TranslatePipe, FormatDatePipe],
  templateUrl: './certifications.html',
})
export class Certifications implements OnInit {
  readonly #facade = inject(PortfolioFacade);
  readonly items = signal<Certification[]>([]);

  ngOnInit(): void {
    this.#facade.getCertifications().subscribe((c) => this.items.set(c));
  }

  formatDate(d: string): string {
    const [y, m] = d.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  }
}
