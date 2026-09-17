import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { Navbar } from './navbar';
import { LangService } from '../../core/services/lang.service';

describe('Navbar', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideTranslateService(), provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Navbar);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('toggleMenu switches menuOpen state', () => {
    const fixture = TestBed.createComponent(Navbar);
    const comp = fixture.componentInstance;
    expect(comp.menuOpen()).toBe(false);
    comp.toggleMenu();
    expect(comp.menuOpen()).toBe(true);
    comp.toggleMenu();
    expect(comp.menuOpen()).toBe(false);
  });

  it('switchLang navigates to the other language route', () => {
    const fixture = TestBed.createComponent(Navbar);
    const comp = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    const initial = comp.currentLang;
    comp.switchLang();

    expect(navigateSpy).toHaveBeenCalledWith(initial === 'fr' ? '/en' : '/fr');
  });

  it('scrollTo scrolls the target element into view and closes the menu', () => {
    const fixture = TestBed.createComponent(Navbar);
    const comp = fixture.componentInstance;
    comp.toggleMenu();
    expect(comp.menuOpen()).toBe(true);

    const el = document.createElement('div');
    el.id = 'about';
    el.scrollIntoView = () => {};
    document.body.appendChild(el);
    const scrollSpy = vi.spyOn(el, 'scrollIntoView').mockImplementation(() => {});

    comp.scrollTo('about');

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
    expect(comp.menuOpen()).toBe(false);
    el.remove();
  });

  it('scrollTo does not overwrite an existing tabindex on the target', () => {
    const fixture = TestBed.createComponent(Navbar);
    const comp = fixture.componentInstance;

    const el = document.createElement('div');
    el.id = 'contact';
    el.setAttribute('tabindex', '0');
    el.scrollIntoView = () => {};
    document.body.appendChild(el);

    comp.scrollTo('contact');

    expect(el.getAttribute('tabindex')).toBe('0');
    el.remove();
  });

  it('scrollTo does nothing when the target element does not exist', () => {
    const fixture = TestBed.createComponent(Navbar);
    const comp = fixture.componentInstance;
    expect(() => comp.scrollTo('does-not-exist')).not.toThrow();
  });

  it('switchLang persists the new language via LangService', () => {
    const fixture = TestBed.createComponent(Navbar);
    const comp = fixture.componentInstance;
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const lang = TestBed.inject(LangService);

    const initial = comp.currentLang;
    comp.switchLang();

    expect(lang.lang()).toBe(initial === 'fr' ? 'en' : 'fr');
  });

  it('clicking the hamburger button opens the mobile menu and updates aria-expanded', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const menuButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-controls="pp-mobile-menu"]',
    );

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#pp-mobile-menu')).toBeNull();

    menuButton.click();
    fixture.detectChanges();

    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#pp-mobile-menu')).not.toBeNull();
  });

  it('opening the mobile menu moves focus to its first item', async () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.toggleMenu();
    fixture.detectChanges();
    await Promise.resolve();

    const firstItem: HTMLButtonElement =
      fixture.nativeElement.querySelector('#pp-mobile-menu button');
    expect(document.activeElement).toBe(firstItem);
  });

  it('Escape closes the mobile menu and returns focus to the toggle button', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const menuButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-controls="pp-mobile-menu"]',
    );

    comp.toggleMenu();
    fixture.detectChanges();

    const panel: HTMLElement = fixture.nativeElement.querySelector('#pp-mobile-menu');
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    panel.dispatchEvent(event);
    fixture.detectChanges();

    expect(preventSpy).toHaveBeenCalled();
    expect(comp.menuOpen()).toBe(false);
    expect(document.activeElement).toBe(menuButton);
  });

  it('Tab on the last menu item wraps focus to the first item', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.toggleMenu();
    fixture.detectChanges();

    const panel: HTMLElement = fixture.nativeElement.querySelector('#pp-mobile-menu');
    const items = panel.querySelectorAll<HTMLButtonElement>('button');
    const first = items[0];
    const last = items[items.length - 1];
    last.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    panel.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab on the first menu item wraps focus to the last item', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.toggleMenu();
    fixture.detectChanges();

    const panel: HTMLElement = fixture.nativeElement.querySelector('#pp-mobile-menu');
    const items = panel.querySelectorAll<HTMLButtonElement>('button');
    const first = items[0];
    const last = items[items.length - 1];
    first.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    panel.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(last);
  });

  it('Tab in the middle of the menu does not trap or move focus', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.toggleMenu();
    fixture.detectChanges();

    const panel: HTMLElement = fixture.nativeElement.querySelector('#pp-mobile-menu');
    const items = panel.querySelectorAll<HTMLButtonElement>('button');
    items[1].focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    panel.dispatchEvent(event);

    expect(preventSpy).not.toHaveBeenCalled();
  });

  it('theme toggle button reflects the current theme via a translated aria-label', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const menuButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-controls="pp-mobile-menu"]',
    );
    const themeButton = menuButton.previousElementSibling as HTMLButtonElement;

    const expectedKey =
      comp.theme.theme() === 'dark' ? 'theme.toggle_to_light' : 'theme.toggle_to_dark';
    expect(themeButton.getAttribute('aria-label')).toBe(expectedKey);
  });

  it('switchLang navigates back to French when the current language is English', () => {
    const fixture = TestBed.createComponent(Navbar);
    const comp = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    TestBed.inject(TranslateService).use('en');

    comp.switchLang();

    expect(navigateSpy).toHaveBeenCalledWith('/fr');
  });

  it('onMenuKeydown ignores keys other than Escape or Tab', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.toggleMenu();
    fixture.detectChanges();

    const panel: HTMLElement = fixture.nativeElement.querySelector('#pp-mobile-menu');
    const event = new KeyboardEvent('keydown', { key: 'a' });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    panel.dispatchEvent(event);

    expect(preventSpy).not.toHaveBeenCalled();
    expect(comp.menuOpen()).toBe(true);
  });

  it('onMenuKeydown does nothing when the menu panel is not rendered', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(() => comp.onMenuKeydown(new KeyboardEvent('keydown', { key: 'Tab' }))).not.toThrow();
  });

  it('scrollTo does nothing outside a browser context (SSR)', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Navbar);
    const comp = fixture.componentInstance;

    expect(() => comp.scrollTo('hero')).not.toThrow();
  });

  it('theme glyph switches between the light and dark icon when toggled', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const menuButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-controls="pp-mobile-menu"]',
    );
    const themeButton = menuButton.previousElementSibling as HTMLButtonElement;

    if (comp.theme.theme() !== 'light') comp.theme.toggle();
    fixture.detectChanges();
    expect(themeButton.textContent?.trim()).toBe('☾');

    comp.theme.toggle();
    fixture.detectChanges();
    expect(themeButton.textContent?.trim()).toBe('☀');
  });
});
