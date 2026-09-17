import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, concat, map, of, startWith, switchMap } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import { Project } from '../../core/models';

type ProjectsResult =
  { status: 'loading' } | { status: 'success'; projects: Project[] } | { status: 'error' };

@Component({
  selector: 'pp-projects',
  imports: [TranslatePipe],
  templateUrl: './projects.html',
})
export class Projects {
  readonly #facade = inject(PortfolioFacade);
  readonly #reload = new Subject<void>();

  readonly #result = toSignal(
    this.#reload.pipe(
      startWith(undefined),
      switchMap(() =>
        concat(
          of<ProjectsResult>({ status: 'loading' }),
          this.#facade.getProjects().pipe(
            map((projects): ProjectsResult => ({ status: 'success', projects })),
            catchError(() => of<ProjectsResult>({ status: 'error' })),
          ),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as ProjectsResult },
  );

  readonly projects = computed(() => {
    const result = this.#result();
    return result.status === 'success' ? result.projects : [];
  });
  readonly loading = computed(() => this.#result().status === 'loading');
  readonly error = computed(() => this.#result().status === 'error');

  load(): void {
    this.#reload.next();
  }
}
