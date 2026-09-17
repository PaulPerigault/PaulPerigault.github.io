import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import { SkillCategory } from '../../core/models';

@Component({
  selector: 'pp-skills',
  imports: [TranslatePipe],
  templateUrl: './skills.html',
})
export class Skills {
  readonly #facade = inject(PortfolioFacade);

  readonly skills = toSignal(this.#facade.getSkills().pipe(catchError(() => of([]))), {
    initialValue: [] as SkillCategory[],
  });
}
