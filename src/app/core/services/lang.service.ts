import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LangService {
  readonly #platformId = inject(PLATFORM_ID);
  readonly #isBrowser = isPlatformBrowser(this.#platformId);
  readonly lang = signal<string>(this.#getInitial());

  set(lang: string): void {
    this.lang.set(lang);
    if (!this.#isBrowser) return;
    localStorage.setItem('lang', lang);
  }

  #getInitial(): string {
    if (!this.#isBrowser) return environment.defaultLang;
    const stored = localStorage.getItem('lang');
    return stored ?? environment.defaultLang;
  }
}
