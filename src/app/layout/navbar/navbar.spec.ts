import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Navbar } from './navbar';

describe('Navbar', () => {
  beforeEach(async () => {
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
});
