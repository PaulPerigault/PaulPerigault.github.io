import { Component, inject, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from './core/services/theme.service';
import { environment } from '../environments/environment';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { Hero } from './features/hero/hero';
import { About } from './features/about/about';
import { Skills } from './features/skills/skills';
import { Experience } from './features/experience/experience';
import { Formation } from './features/formation/formation';
import { Projects } from './features/projects/projects';
import { Certifications } from './features/certifications/certifications';
import { Contact } from './features/contact/contact';

@Component({
  selector: 'app-root',
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
  templateUrl: './app.html',
})
export class App implements OnInit {
  readonly #theme = inject(ThemeService);
  readonly #translate = inject(TranslateService);

  ngOnInit(): void {
    this.#theme.init();
    const stored = localStorage.getItem('lang');
    const browser = this.#translate.getBrowserLang() ?? environment.defaultLang;
    const lang =
      stored ?? (environment.supportedLangs.includes(browser) ? browser : environment.defaultLang);
    this.#translate.use(lang);
  }
}
