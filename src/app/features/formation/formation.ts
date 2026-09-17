import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatDatePipe } from '../../shared/pipes';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import type { Formation as FormationItem } from '../../core/models';

@Component({
  selector: 'pp-formation',
  imports: [TranslatePipe, FormatDatePipe],
  templateUrl: './formation.html',
})
export class Formation {
  readonly #facade = inject(PortfolioFacade);

  readonly items = toSignal(this.#facade.getFormation().pipe(catchError(() => of([]))), {
    initialValue: [] as FormationItem[],
  });
}
