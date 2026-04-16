import { Component, inject, OnInit, signal } from '@angular/core';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import { SkillCategory } from '../../core/models';

@Component({
  selector: 'pp-skills',
  imports: [],
  templateUrl: './skills.html',
})
export class Skills implements OnInit {
  readonly #facade = inject(PortfolioFacade);
  readonly skills = signal<SkillCategory[]>([]);

  ngOnInit(): void {
    this.#facade.getSkills().subscribe((s) => this.skills.set(s));
  }
}
