import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
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
  // viewChild() requires a TS `private` field (Angular can't process signal queries on `#` private fields).
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly menuPanel = viewChild<ElementRef<HTMLElement>>('menuPanel');

  get currentLang(): string {
    return this.#translate.currentLang ?? 'fr';
  }

  toggleMenu(): void {
    const opening = !this.menuOpen();
    this.menuOpen.set(opening);
    if (opening) queueMicrotask(() => this.#focusFirstMenuItem());
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu();
      this.menuButton()?.nativeElement.focus();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusables = this.menuPanel()?.nativeElement.querySelectorAll<HTMLElement>('button');
    if (!focusables?.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  switchLang(): void {
    const next = this.currentLang === 'fr' ? 'en' : 'fr';
    this.#lang.set(next);
    this.#router.navigateByUrl(`/${next}`);
  }

  scrollTo(id: string): void {
    if (!isPlatformBrowser(this.#platformId)) return;
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    this.closeMenu();
  }

  #focusFirstMenuItem(): void {
    this.menuPanel()?.nativeElement.querySelector<HTMLElement>('button')?.focus();
  }
}
