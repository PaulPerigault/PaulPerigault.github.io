import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import { Project } from '../../core/models';

@Component({
  selector: 'pp-projects',
  imports: [TranslatePipe],
  templateUrl: './projects.html',
})
export class Projects implements OnInit {
  readonly #facade = inject(PortfolioFacade);
  readonly projects = signal<Project[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.#facade.getProjects().subscribe({
      next: (p) => {
        this.projects.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
