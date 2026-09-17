import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SeoService } from '../../core/services/seo.service';
import { LangService } from '../../core/services/lang.service';
import { PortfolioFacade } from '../../core/services/portfolio.facade';
import { Navbar } from '../../layout/navbar/navbar';
import { Footer } from '../../layout/footer/footer';
import { Hero } from '../../features/hero/hero';
import { About } from '../../features/about/about';
import { Skills } from '../../features/skills/skills';
import { Experience } from '../../features/experience/experience';
import { Formation } from '../../features/formation/formation';
import { Projects } from '../../features/projects/projects';
import { Certifications } from '../../features/certifications/certifications';
import { Contact } from '../../features/contact/contact';

@Component({
  selector: 'pp-portfolio-page',
  imports: [
    Navbar,
    Footer,
    Hero,
    About,
    Skills,
    Experience,
    Formation,
    Projects,
    Certifications,
    Contact,
  ],
  templateUrl: './portfolio-page.html',
})
export class PortfolioPage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #translate = inject(TranslateService);
  readonly #seo = inject(SeoService);
  readonly #lang = inject(LangService);
  readonly #facade = inject(PortfolioFacade);

  ngOnInit(): void {
    const lang = (this.#route.snapshot.data['lang'] as string) ?? 'fr';

    this.#translate.use(lang).subscribe(() => {
      forkJoin({
        skills: this.#facade.getSkills(),
        certifications: this.#facade.getCertifications(),
        projectsConfig: this.#facade.getProjectsConfig(),
      }).subscribe(({ skills, certifications, projectsConfig }) => {
        this.#seo.update({
          lang,
          path: `/${lang}`,
          title: this.#translate.instant('seo.title'),
          description: this.#translate.instant('seo.description'),
          skills: skills.flatMap((category) => category.items),
          certifications,
          projects: projectsConfig.featured,
        });
      });
    });

    this.#lang.set(lang);
  }
}
