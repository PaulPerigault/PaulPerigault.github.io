import { Component, inject, signal } from '@angular/core';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'pp-navbar',
  imports: [TranslatePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly #translate = inject(TranslateService);
  readonly theme = inject(ThemeService);
  readonly menuOpen = signal(false);

  get currentLang(): string {
    return this.#translate.currentLang ?? 'fr';
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  switchLang(): void {
    const next = this.currentLang === 'fr' ? 'en' : 'fr';
    this.#translate.use(next);
    localStorage.setItem('lang', next);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    this.closeMenu();
  }
}
