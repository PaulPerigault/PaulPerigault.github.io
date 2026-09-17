import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatDatePipe } from '../../shared/pipes';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import type { Experience as ExperienceItem } from '../../core/models';

@Component({
  selector: 'pp-experience',
  imports: [TranslatePipe, FormatDatePipe],
  templateUrl: './experience.html',
})
export class Experience {
  readonly #facade = inject(PortfolioFacade);

  readonly items = toSignal(this.#facade.getExperience().pipe(catchError(() => of([]))), {
    initialValue: [] as ExperienceItem[],
  });
}
