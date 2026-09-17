import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { FormatDatePipe } from '../../shared/pipes';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import { Certification } from '../../core/models';

@Component({
  selector: 'pp-certifications',
  imports: [TranslatePipe, FormatDatePipe],
  templateUrl: './certifications.html',
})
export class Certifications {
  readonly #facade = inject(PortfolioFacade);

  readonly items = toSignal(this.#facade.getCertifications().pipe(catchError(() => of([]))), {
    initialValue: [] as Certification[],
  });
}
