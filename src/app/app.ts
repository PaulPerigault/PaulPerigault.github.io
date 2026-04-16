import { Component, inject, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from './core/services/theme.service';
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
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly #theme = inject(ThemeService);
  readonly #translate = inject(TranslateService);

  ngOnInit(): void {
    this.#theme.init();
    const browser = this.#translate.getBrowserLang() ?? 'fr';
    const stored = localStorage.getItem('lang');
    const lang = stored ?? (['fr', 'en'].includes(browser) ? browser : 'fr');
    this.#translate.use(lang);
  }
}
