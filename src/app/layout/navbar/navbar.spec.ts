import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
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
});
