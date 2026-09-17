import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';
import { LangService } from '../../core/services/lang.service';

@Component({
  selector: 'pp-navbar',
  imports: [TranslatePipe],
  templateUrl: './navbar.html',
})
export class Navbar {
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);
  readonly #platformId = inject(PLATFORM_ID);
  readonly theme = inject(ThemeService);
  readonly #lang = inject(LangService);
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
    this.#lang.set(next);
    this.#router.navigateByUrl(`/${next}`);
  }

  scrollTo(id: string): void {
    if (!isPlatformBrowser(this.#platformId)) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    this.closeMenu();
  }
}
